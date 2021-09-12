import consola from 'consola'
import fs from 'graceful-fs'
import path from 'path'
import csv from 'csvtojson'
import { Writable } from 'stream'

const fsPromises = fs.promises
const {createReadStream, createWriteStream} = fs
const extract_fullname = (obj) => [obj.Nombres, obj.Paterno, obj.Materno].join(" ")
const create_slug = (str) => str.replace(/[^\p{L}]+/gu,"_").toLowerCase()
const extract_name = (obj) => ({
  name:obj.Nombres,
  surname1:obj.Paterno,
  surname2:obj.Materno,
  fullname:extract_fullname(obj),
  slug:create_slug(extract_fullname(obj))
})

const safe_append_multi_level_object = (obj, ...levels) => {
  if(levels.length <= 1) return obj
  if(levels.length == 2) return {...obj, [levels[0]]: levels[1]}
  if(levels.length > 2) return {...obj, [levels[0]]: safe_append_multi_level_object((obj[levels[0]] || {}), ...levels.slice(1))}
}

const month_to_number = new Map([
  ["Enero", 1],
  ["Febrero", 2],
  ["Marzo", 3],
  ["Abril", 4],
  ["Mayo", 5],
  ["Junio", 6],
  ["Julio", 7],
  ["Agosto", 8],
  ["Septiembre", 9],
  ["Octubre", 10],
  ["Noviembre", 11],
  ["Diciembre", 12]
])
const extract_date = (obj) => ({
  year: obj.anyo,
  month: month_to_number.get(obj.Mes) ?? 0,
  monthString: obj.Mes
})

class PaymentsWriter extends Writable {
  constructor(nameTempMap, namesFileWriteStream, paymentTempMap) {
    super()
    this.nameTempMap = nameTempMap
    this.namesFileWriteStream = namesFileWriteStream
    this.paymentTempMap = paymentTempMap
  }
  async _write(chunk, encoding, callback) {
    const payment = JSON.parse(chunk)
    const nameObj = extract_name(payment)
    if(!this.nameTempMap.has(nameObj.slug)){
      this.nameTempMap.set(nameObj.slug, true);
      if(this.nameTempMap.size == 1) this.namesFileWriteStream.write(JSON.stringify(nameObj))
      else this.namesFileWriteStream.write(",".concat(JSON.stringify(nameObj)))
      if(this.nameTempMap.size % 1000 == 0) consola.info("processed", this.nameTempMap.size, "names")
    }
    const slug = create_slug(extract_fullname(payment))
    const date = extract_date(payment)
    let previousPayments
    if (!this.paymentTempMap.has(slug)) {
      this.paymentTempMap.set(slug,true)
      await fsPromises.mkdir(`./static/person/${slug}`, {recursive:true})
      previousPayments = {}
    } else try {
      previousPayments = JSON.parse(await fsPromises.readFile(`./static/person/${slug}/payments.json`))
    }
    catch (error) {
      consola.error("error reading",`./static/person/${slug}/payments.json`)
      consola.error(error.message)
      previousPayments = {}
    }
    const newPayments = safe_append_multi_level_object(previousPayments, slug, date.year, date.month, payment)
    await fsPromises.writeFile(`./static/person/${slug}/payments.json`,JSON.stringify(newPayments),{flag: "w+"})
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

