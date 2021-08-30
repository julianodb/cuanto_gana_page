import consola from 'consola'

export default function ContentPreprocessorModule() {

  const extract_fullname = (obj) => [obj.Nombres, obj.Paterno, obj.Materno].join(" ")
  const create_slug = (str) => str.replace(/\s+/g,"_").toLowerCase()
  const extract_name = (obj) => ({
    name:obj.Nombres,
    surname1:obj.Paterno,
    surname2:obj.Materno,
    fullname:extract_fullname(obj),
    slug:create_slug(extract_fullname(obj))
  })
  const nameTempMap = new Map();

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
  var paymentObjects = {};

  const { $content } = require('@nuxt/content')
  const fs = require('fs/promises')
  const {createReadStream, createWriteStream} = require('fs')
  const path = require('path')
  const csv=require('csvtojson')

  this.nuxt.hook('build:before', async builder => {
    consola.info("Preprocessing content")
    const process_dump = dump => {
      const namesWithRepetitions = dump.map(extract_name)
      namesWithRepetitions.forEach( (nameObj) => {
        if(!nameTempMap.has(nameObj.slug)){
            nameTempMap.set(nameObj.slug, true);
            //nameObjects.push(nameObj)
        }
      })
      dump.forEach( (payment) => {
        const slug = create_slug(extract_fullname(payment))
        const date = extract_date(payment)
        paymentObjects = safe_append_multi_level_object(paymentObjects, slug, date.year, date.month, payment)
      })
    }
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
            .on('data', async (data) => {
              const payment = JSON.parse(data)
              const nameObj = extract_name(payment)
              if(!nameTempMap.has(nameObj.slug)){
                nameTempMap.set(nameObj.slug, true);
                if(nameTempMap.size == 1) namesFileWriteStream.write(JSON.stringify(nameObj))
                else namesFileWriteStream.write(",".concat(JSON.stringify(nameObj)))
                if(nameTempMap.size % 1000 == 0) consola.info("processed",nameTempMap.size,"names")
              }
              const slug = create_slug(extract_fullname(payment))
              const date = extract_date(payment)
              if (!(slug in paymentWriterStreams)) {
                paymentWriterStreams[slug] = await fs.mkdir(`./static/person/${slug}`, {recursive:true})
                  .then(() => createWriteStream(`./static/person/${slug}/payments.json`,{flags: "w+"}))
                paymentWriterStreams[slug].write("[")
                paymentWriterStreams[slug].write(JSON.stringify(payment))
              } else {
                paymentWriterStreams[slug].write(",".concat(JSON.stringify(payment)))
              }
            })
            .on('end', resolve)
            .on('error', reject)
        })
      })))
      .then(() => namesFileWriteStream.write("]"))
      .then(() => Object.entries(paymentWriterStreams).map(([slug, stream]) => stream.write("]")))
      .then(() => consola.success("Preprocessed content generated"))
  })
}
