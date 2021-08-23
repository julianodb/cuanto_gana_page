import consola from 'consola'

export default function ContentPreprocessorModule() {

  const extract_name = (obj) => [obj.Nombres, obj.Paterno, obj.Materno].join(" ")
  const create_slug = (str) => str.replace(/\s+/g,"_").toLowerCase()

  const error_handler = err => {if(err) consola.error(err)}

  const { $content } = require('@nuxt/content')
  const fs = require('fs')

  this.nuxt.hook('build:before', async builder => {
    consola.info("Preprocessing content")
    const sample = await $content('sample').only(["body"]).fetch()

    const names = sample.body.map(a => {
      return {
        name: extract_name(a),
        slug: create_slug(extract_name(a))
      }
    })
    fs.writeFile('./content/names.json', JSON.stringify(names), error_handler)

    const moneys = sample.body.reduce((acc,cur) => {
      const nameSlug = create_slug(extract_name(cur))
      const previousArray = (acc[nameSlug] || [])
      const contentWithSlug = {...cur, ["slug"]: previousArray.length.toString() }
      return {...acc, [nameSlug]: [...previousArray, contentWithSlug]}
    },{})

    for (let nameSlug in moneys) {
      fs.mkdir(`./content/${nameSlug}`,{recursive:true},err => {
        if(err) return error_handler(err)
        fs.writeFile(`./content/${nameSlug}/money.json`, JSON.stringify(moneys[nameSlug]), error_handler)
      })
    }
    consola.success("Preprocessed content generated")
  })
}
