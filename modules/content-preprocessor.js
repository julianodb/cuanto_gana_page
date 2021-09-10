import consola from 'consola'

export default function ContentPreprocessorModule() {

  const fs = require('graceful-fs').promises
  const {createReadStream, createWriteStream} = require('graceful-fs')
  const path = require('path')
  const csv=require('csvtojson')
  const { Writable } = require('stream')

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
          await fs.mkdir(`./static/person/${slug}`, {recursive:true})
          previousPayments = {}
        } else {
          previousPayments = JSON.parse(await fs.readFile(`./static/person/${slug}/payments.json`))
       }
       const newPayments = safe_append_multi_level_object(previousPayments, slug, date.year, date.month, payment)
       await fs.writeFile(`./static/person/${slug}/payments.json`,JSON.stringify(newPayments),{flag: "w+"})

        callback()
    }
  }

  this.nuxt.hook('build:before', async builder => {
    consola.info("Preprocessing content")
    const nameTempMap = new Map();
    const namesFileWriteStream = createWriteStream('./content/names.json',{flags: "w+"})
    const paymentTempMap = new Map();
    const content_src = 'content_src'

    namesFileWriteStream.write('[')
    return await fs.readdir(content_src)
      .then(files => files.filter(file => path.extname(file).toLowerCase() === ".csv"))
      .then(files => Promise.all(files.map(file => {
        consola.info("Processing file", file)
        return new Promise((resolve,reject) => {
          const readStream = createReadStream(path.join(content_src,file), 'latin1')
          readStream
            .pipe(csv({delimiter: ";",checkType:true}))
            .pipe(new PaymentsWriter(nameTempMap, namesFileWriteStream, paymentTempMap))
            .on('finish', resolve)
            .on('error', reject)
        })
      })))
      .then(() => namesFileWriteStream.write("]"))
      .then(() => consola.success("Preprocessed content generated"))
  })
}
