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
const metadata_from_list = (list) => ({"first": list[0], "last": list[list.length-1], "count": list.length})
const update_list = async (path, newList, i, listsMetadata) => {
  await fsPromises.writeFile(`${path}/${i}.json`,JSON.stringify(newList),{flag: "w+"})
  if (listsMetadata.length <= i) listsMetadata.push(metadata_from_list(newList))
  else listsMetadata[i] = metadata_from_list(newList)
}
const treeThreshold = 500
const rootPath = "./static/name_search"

class NameWriter extends Writable {
  constructor(partialWord, options = {objectMode:true, highWaterMark:100}) {
    super(options)
    this.partialWord = partialWord
    this.levels = [...Array(partialWord.length).keys()].map(i => partialWord.slice(0,i+1))
    this.path = `${rootPath}/${this.levels.join("/")}`
    this.built = false
  }
  async build() {
    await fsPromises.mkdir(this.path, {recursive:true})
  }
  async _write({name, offset}, encoding, callback) {
    if(!this.built) {
      await this.build()
      this.built = true
    }
    const update_children = async (index, tree) => {
      for(const partialWord in tree) {
        if(partialWord == this.partialWord) continue; // avoid children that are a copy of parent (infinite loop)
        for(const nameObj of tree[partialWord])
          if(!name_writing_stream(partialWord).write(nameObj)) {
            await new Promise(resolve => name_writing_stream(partialWord).once('drain',resolve))
          }
        if(!index.children.includes(partialWord)) index.children = [...index.children, partialWord].sort()
      }
    }
    try {
      // get index
      let index
      const indexCandidate = await fsPromises.readFile(`${this.path}/index.json`,{flag:"a+"})
      if(indexCandidate=="") index = {'countOfNames': 0, 'listsMetadata':[], 'children':[]}
      else index = JSON.parse(indexCandidate)
      index.countOfNames++

      // update children with names in current list when treeThreshold is reached
      if(index.countOfNames == treeThreshold) {
        const tempTree = JSON.parse(await fsPromises.readFile(`${this.path}/temp_tree.json`,{flag:"r"}))
        await update_children(index, tempTree)
      }

      // update index
      let wordToAdd = name
      let allContent = []
      for(const [i, list] of index.listsMetadata.entries()) {

        if(list.last < wordToAdd && list.count >= treeThreshold) continue

        const currListOldContent = JSON.parse(await fsPromises.readFile(`${this.path}/${i}.json`))
        allContent = [...new Set([...currListOldContent, wordToAdd])].sort()
        const currListNewContent = allContent.slice(0,treeThreshold)

        if(list.last < wordToAdd  && list.count >= treeThreshold) continue
        await update_list(`${this.path}`,currListNewContent, i, index.listsMetadata) //TODO: update this ?
        wordToAdd = allContent[allContent.length-1]

      }
      // add new list if necessary
      if(index.listsMetadata.length == 0 ||
        (index.listsMetadata[index.listsMetadata.length-1].count >= treeThreshold &&
        index.listsMetadata[index.listsMetadata.length-1].last != wordToAdd)) {
          await update_list(`${this.path}`,[wordToAdd], index.listsMetadata.length, index.listsMetadata)
        }
      // update children with new name if necessary
      if(index.countOfNames >= treeThreshold) await update_children(index, {[name.slice(offset,offset+this.levels.length+1)]: [{name:name, offset:offset}]})
      else { //create/update temp tree while countOfNames < treeThreshold
        let tempTree
        const tempTreeCandidate = await fsPromises.readFile(`${this.path}/temp_tree.json`,{flag:"a+"})
        if(tempTreeCandidate=="") tempTree = {}
        else tempTree = JSON.parse(tempTreeCandidate)

        const partialWord = name.slice(offset, offset+this.levels.length+1)
        const nameObj = {name:name, offset:offset}
        if (partialWord in tempTree && !tempTree[partialWord].includes(nameObj)) tempTree[partialWord] = [...tempTree[partialWord], nameObj]
        else tempTree[partialWord] = [nameObj]
        await fsPromises.writeFile(`${this.path}/temp_tree.json`,JSON.stringify(tempTree),{flag: "w"})
      }

      await fsPromises.writeFile(`${this.path}/index.json`,JSON.stringify(index),{flag: "w"})
      callback()
    } catch (e) {
      consola.error(e.message)
      throw e
    }
  }
}
class PaymentsWriter extends Writable {
  constructor(nameTempMap, paymentTempMap, file = "") {
    super()
    this.nameTempMap = nameTempMap
    this.paymentTempMap = paymentTempMap
    this.file = file
    this.processed = 0
  }
  async _write(chunk, encoding, callback) {

    const payment = new ContrataPayment(JSON.parse(chunk))

    // payments
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

    // names
    const name = payment.slug
    if(++this.processed % 1000 == 0) consola.info(`processed ${this.processed} payments from file ${this.file}. Current person: ${name}`)

    if(this.nameTempMap.has(name)) return callback();
    this.nameTempMap.set(name, true);

    for(const word of name.split("_")) {
      try {
        const offset = name.indexOf(word)
        if(isNaN(name.charCodeAt(offset))) continue;
        if(!name_writing_stream(`${name.charAt(offset)}`).write({name, offset})) {
          await new Promise(resolve => name_writing_stream(`${name.charAt(offset)}`).once('drain',resolve))
        }
      } catch(e) {throw(e)}
    }
    callback()
  }
}

consola.info("Preprocessing content")
const nameTempMap = new Map();
const paymentTempMap = new Map();
const nameWritingStreams = new Map();
const name_writing_stream = (partialWord) => {
  if(nameWritingStreams.has(partialWord)) return nameWritingStreams.get(partialWord)
  const newWritingStream = new NameWriter(partialWord)
  nameWritingStreams.set(partialWord, newWritingStream)
  newWritingStream.setMaxListeners(100)
  return newWritingStream
}
const content_src = 'content_src'

const srcFiles = (await fsPromises.readdir(content_src))
                    .filter(file => path.extname(file).toLowerCase() === ".csv")
try{
  await Promise.all(srcFiles.map( async file => {
    consola.info("Processing file", file)
    try{
      await new Promise((resolve,reject) => {
        const readStream = createReadStream(path.join(content_src,file), 'latin1')
        readStream
          .pipe(csv({delimiter: ";",checkType:true}))
          .pipe(new PaymentsWriter(nameTempMap, paymentTempMap, file))
          .on('finish', resolve)
          .on('error', reject)
      })
    } catch(e) {throw(e)}
  }))
} catch(e) {throw(e)}
consola.success("Preprocessed content generated")

