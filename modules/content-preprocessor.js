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
  const paymentObjects = {};

  const { $content } = require('@nuxt/content')
  const fs = require('fs/promises')

  this.nuxt.hook('build:before', async builder => {
    consola.info("Preprocessing content")
    const process_dump = dump => {
      consola.info("Processing file ", dump.path)
      const namesWithRepetitions = dump.body.map(extract_name)
      namesWithRepetitions.forEach( (nameObj) => {
        if(!nameTempMap.has(nameObj.slug)){
            nameTempMap.set(nameObj.slug, true);
            nameObjects.push(nameObj)
        }
      })
      dump.body.forEach( (payment) => {
        const slug = create_slug(extract_fullname(payment))
        const date = extract_date(payment)
        paymentObjects[slug] = {...(paymentObjects[slug] || {}), [date.year] : {[date.month] : payment}}
      })
    }
    return await $content('')
      .where({extension:{$eq:".csv"}})
      .only(["body","path"])
      .fetch()
      .then(dumps => !Array.isArray(dumps)? process_dump(dumps) : dumps.map(process_dump))
      .then(() => fs.writeFile('./static/names.json', JSON.stringify(nameObjects)))
      .then(() => Promise.all(Object.entries(paymentObjects)
        .map(([slug, payment]) =>
          fs.mkdir(`./static/${slug}`, {recursive:true})
          .then(() => fs.writeFile(`./static/${slug}/payments.json`, JSON.stringify(payment)))
        )
      ))
      .then(() => consola.success("Preprocessed content generated"))
  })
}
