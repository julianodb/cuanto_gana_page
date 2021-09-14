import consola from 'consola'
import fs from 'graceful-fs'
import path from 'path'
import csv from 'csvtojson'
import { Writable } from 'stream'
import ContrataPayment from './ContrataPayment.mjs'

const fsPromises = fs.promises
const {createReadStream, createWriteStream} = fs

const safe_append_multi_level_object = (obj, ...levels) => {
  if(levels.length <= 1) return obj
  if(levels.length == 2) return {...obj, [levels[0]]: levels[1]}
  if(levels.length > 2) return {...obj, [levels[0]]: safe_append_multi_level_object((obj[levels[0]] || {}), ...levels.slice(1))}
}

class PaymentsWriter extends Writable {
  constructor(nameTempMap, namesFileWriteStream, paymentTempMap) {
    super()
    this.nameTempMap = nameTempMap
    this.namesFileWriteStream = namesFileWriteStream
    this.paymentTempMap = paymentTempMap
  }
  async _write(chunk, encoding, callback) {
    const payment = new ContrataPayment(JSON.parse(chunk))
    const nameObj = {fullName:payment.fullName, slug:payment.slug}
    if(!this.nameTempMap.has(nameObj.slug)){
      this.nameTempMap.set(nameObj.slug, true);
      if(this.nameTempMap.size == 1) this.namesFileWriteStream.write(JSON.stringify(nameObj))
      else this.namesFileWriteStream.write(",".concat(JSON.stringify(nameObj)))
      if(this.nameTempMap.size % 1000 == 0) consola.info("processed", this.nameTempMap.size, "names")
    }
    let previousPayments
    if (!this.paymentTempMap.has(payment.slug)) {
      this.paymentTempMap.set(payment.slug,true)
      await fsPromises.mkdir(`./static/person/${payment.slug}`, {recursive:true})
      previousPayments = {}
    } else try {
      previousPayments = JSON.parse(await fsPromises.readFile(`./static/person/${payment.slug}/payments.json`))
    } catch (error) {
      consola.error("error processing",`./static/person/${payment.slug}/payments.json`)
      consola.error(error.message)
      previousPayments = {}
    }
    const newPayments = safe_append_multi_level_object(previousPayments, payment.slug, payment.year, payment.month, payment)
    await fsPromises.writeFile(`./static/person/${payment.slug}/payments.json`,JSON.stringify(newPayments),{flag: "w+"})
    callback()
  }
}

consola.info("Preprocessing content")
const nameTempMap = new Map();
const namesFileWriteStream = createWriteStream('./content/names.json',{flags: "w+"})
const paymentTempMap = new Map();
const content_src = 'content_src'

namesFileWriteStream.write('[')

const srcFiles = (await fsPromises.readdir(content_src))
                    .filter(file => path.extname(file).toLowerCase() === ".csv")
await Promise.all(srcFiles.map(file => {
  consola.info("Processing file", file)
  return new Promise((resolve,reject) => {
    const readStream = createReadStream(path.join(content_src,file), 'latin1')
    readStream
      .pipe(csv({delimiter: ";",checkType:true}))
      .pipe(new PaymentsWriter(nameTempMap, namesFileWriteStream, paymentTempMap))
      .on('finish', resolve)
      .on('error', reject)
  })
}))
namesFileWriteStream.write("]")
consola.success("Preprocessed content generated")

