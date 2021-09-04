import consola from 'consola'

export default function ContentPreprocessorModule() {

  const { $content } = require('@nuxt/content')
  const fs = require('graceful-fs').promises
  const {createReadStream, createWriteStream} = require('graceful-fs')
  const path = require('path')
  const csv=require('csvtojson')
  const { Writable, Readable, pipeline } = require('stream')
  const { promisify } = require('util')

  const extract_fullname = (obj) => [obj.Nombres, obj.Paterno, obj.Materno].join(" ")
  const create_slug = (str) => str.replace(/\s+/g,"_").toLowerCase()
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
    constructor(nameTempMap, namesFileWriteStream, paymentWriterStreams) {
      super()
      this.nameTempMap = nameTempMap
      this.namesFileWriteStream = namesFileWriteStream
      this.paymentWriterStreams = paymentWriterStreams
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
        if (!(slug in this.paymentWriterStreams)) {
          this.paymentWriterStreams[slug] = true
          await fs.mkdir(`./static/person/${slug}`, {recursive:true})
          await fs.writeFile(`./static/person/${slug}/payments.json`,"[".concat(JSON.stringify(payment)),{flag: "w+"})
        } else {
          await fs.writeFile(`./static/person/${slug}/payments.json`,",".concat(JSON.stringify(payment)),{flag: "a"})
        }
        callback()
    }
  }
  const paymentFilesCloser = new Writable({
    async write(slug, encoding, callback) {
      await fs.writeFile(`./static/person/${slug}/payments.json`,"]",{flag: "a"})
      callback()
    }
  })

  this.nuxt.hook('build:before', async builder => {
    consola.info("Preprocessing content")
    const nameTempMap = new Map();
    const namesFileWriteStream = createWriteStream('./content/names.json',{flags: "w+"})
    const paymentWriterStreams = {}
    const content_src = 'content_src'
    return await fs.readdir(content_src)
      .then(files => files.filter(file => path.extname(file).toLowerCase() === ".csv"))
      .then(files => Promise.all(files.map(file => {
        consola.info("Processing file ", file)
        namesFileWriteStream.write('[')
        return new Promise((resolve,reject) => {
          const readStream = createReadStream(path.join(content_src,file), 'latin1')
          readStream
            .pipe(csv({delimiter: ";",checkType:true}))
            .pipe(new PaymentsWriter(nameTempMap, namesFileWriteStream, paymentWriterStreams))
            .on('finish', resolve)
            .on('error', reject)
        })
      })))
      .then(() => namesFileWriteStream.write("]"))
      .then(() => promisify(pipeline)(Readable.from(Object.keys(paymentWriterStreams)),paymentFilesCloser))
      .then(() => consola.success("Preprocessed content generated"))
  })
}
