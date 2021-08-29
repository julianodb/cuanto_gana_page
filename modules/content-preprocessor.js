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
  const nameObjects = [];
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
  const path = require('path')
  const csv=require('csvtojson')

  this.nuxt.hook('build:before', async builder => {
    consola.info("Preprocessing content")
    const process_dump = dump => {
      const namesWithRepetitions = dump.map(extract_name)
      namesWithRepetitions.forEach( (nameObj) => {
        if(!nameTempMap.has(nameObj.slug)){
            nameTempMap.set(nameObj.slug, true);
            nameObjects.push(nameObj)
        }
      })
      dump.forEach( (payment) => {
        const slug = create_slug(extract_fullname(payment))
        const date = extract_date(payment)
        paymentObjects = safe_append_multi_level_object(paymentObjects, slug, date.year, date.month, payment)
      })
    }
    const content_src = 'content_src'
    return await fs.readdir(content_src)
      .then(files => files.filter(file => path.extname(file).toLowerCase() === ".csv"))
      .then(files => Promise.all(files.map(file => {
        consola.info("Processing file ", file)
        return fs.readFile(path.join(content_src,file), 'latin1')
          .then(fileContent => csv({delimiter: ";",checkType:true}).fromString(fileContent))
          .then(process_dump)
        }))
      )
      .then(() => fs.writeFile('./content/names.json', JSON.stringify(nameObjects)))
      .then(() => Promise.all(Object.entries(paymentObjects)
        .map(([slug, payment]) =>
          fs.mkdir(`./static/person/${slug}`, {recursive:true})
          .then(() => fs.writeFile(`./static/person/${slug}/payments.json`, JSON.stringify(payment)))
        )
      ))
      .then(() => consola.success("Preprocessed content generated"))

  })
}
