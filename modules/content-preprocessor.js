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
  const tempMap = new Map();

  const error_handler = err => {if(err) consola.error(err)}

  const { $content } = require('@nuxt/content')
  const fs = require('fs/promises')

  this.nuxt.hook('build:before', async builder => {
    consola.info("Preprocessing content")
    const process_dump = dump => {
      const namesWithRepetitions = dump.body.map(extract_name)
      namesWithRepetitions.forEach( (nameObj) => {
        if(!tempMap.has(nameObj.slug)){
            tempMap.set(nameObj.slug, true);
            nameObjects.push(nameObj)
        }
      })
      return fs.writeFile('./content/names.json', JSON.stringify(nameObjects))
    }
    return await $content('')
      .where({extension:{$eq:".csv"}})
      .only(["body"])
      .fetch()
      .then(dumps => !Array.isArray(dumps)? process_dump(dumps) : Promise.all(dumps.map(process_dump)))
      .then(() => consola.success("Preprocessed content generated"))
  })
}
