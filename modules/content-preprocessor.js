import consola from 'consola'

export default function ContentPreprocessorModule() {

  const { $content } = require('@nuxt/content')
  const fs = require('fs')

  this.nuxt.hook('build:before', async builder => {
    consola.info("Preprocessing content")
    const sample = await $content('sample').only(["body"]).fetch()
    const names = sample.body.map(a => {
      const fullname = [a.Nombres, a.Paterno, a.Materno].join(" ")
      return {
        name: fullname,
        slug: fullname.replace(/\s+/g,"_").toLowerCase()
      }
    })
    fs.writeFile('./content/names.json', JSON.stringify(names), err => {if(err) consola.error(err)})
    consola.success("Preprocessed content generated")
  })
}
