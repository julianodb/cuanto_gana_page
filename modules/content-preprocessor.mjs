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
const update_list = async (path, newList, index, listsMetadata) => {
  await fsPromises.writeFile(`${path}/${index}.json`,JSON.stringify(newList),{flag: "w+"})
  if (listsMetadata.length <= index) listsMetadata.push(metadata_from_list(newList))
  else listsMetadata[index] = metadata_from_list(newList)
}
const treeThreshold = 500
const rootPath = "./static/name_search"

class PaymentsWriter extends Writable {
  constructor(nameTempMap, paymentTempMap) {
    super()
    this.nameTempMap = nameTempMap
    this.paymentTempMap = paymentTempMap
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
    if(++this.processed % 500 == 0) consola.info(`processed ${this.processed} payments. Current person: ${name}`)

    if(this.nameTempMap.has(name)) {callback(); return;}
    this.nameTempMap.set(name, true);

    const addNameToBranch = async (nameToAdd, offset=0, ...levels) => {
      const update_children = async (index, tree) => {
        for(const child in tree) {
          for(const childName of tree[child]) await addNameToBranch(childName.name, childName.offset, ...levels, child)
          if(!index.children.includes(child)) index.children = [...index.children, child].sort()
        }
      }
      await fsPromises.mkdir(`${rootPath}/${levels.join("/")}`, {recursive:true})

      // get index
      let index
      const indexCandidate = await fsPromises.readFile(`${rootPath}/${levels.join("/")}/index.json`,{flag:"a+"})
      if(indexCandidate=="") index = {'countOfNames': 0, 'listsMetadata':[], 'children':[]}
      else index = JSON.parse(indexCandidate)
      index.countOfNames++

      // update index
      let wordToAdd = nameToAdd
      let allContent = []
      for(const [i, list] of index.listsMetadata.entries()) {

        // update children with names in current list when treeThreshold is reached
        if(index.countOfNames == treeThreshold) {
          const tempTree = JSON.parse(await fsPromises.readFile(`${rootPath}/${levels.join("/")}/temp_tree.json`,{flag:"r"}))
          await update_children(index, tempTree)
        }

        if(list.last < wordToAdd && list.count >= treeThreshold) continue

        const currListOldContent = JSON.parse(await fsPromises.readFile(`${rootPath}/${levels.join("/")}/${i}.json`))
        allContent = [...new Set([...currListOldContent, wordToAdd])].sort()
        const currListNewContent = allContent.slice(0,treeThreshold)

        if(list.last < wordToAdd  && list.count >= treeThreshold) continue
        await update_list(`${rootPath}/${levels.join("/")}`,currListNewContent, i, index.listsMetadata)
        wordToAdd = allContent[allContent.length-1]

      }
      // add new list if necessary
      if(index.listsMetadata.length == 0 ||
        (index.listsMetadata[index.listsMetadata.length-1].count >= treeThreshold &&
         index.listsMetadata[index.listsMetadata.length-1].last != wordToAdd)) {
          await update_list(`${rootPath}/${levels.join("/")}`,[wordToAdd], index.listsMetadata.length, index.listsMetadata)
        }
      // update children with new name if necessary
      if(index.countOfNames >= treeThreshold) await update_children(index, {[nameToAdd.slice(offset,offset+levels.length+1)]: [{name:nameToAdd, offset:offset}]})
      else { //create/update temp tree while countOfNames < treeThreshold
        let tempTree
        const tempTreeCandidate = await fsPromises.readFile(`${rootPath}/${levels.join("/")}/temp_tree.json`,{flag:"a+"})
        if(tempTreeCandidate=="") tempTree = {}
        else tempTree = JSON.parse(tempTreeCandidate)

        const twoDigit = nameToAdd.slice(offset,offset+levels.length+1)
        const nameObj = {name:nameToAdd, offset:offset}
        if (twoDigit in tempTree && !tempTree[twoDigit].includes(nameObj)) tempTree[twoDigit] = [...tempTree[twoDigit], nameObj]
        else tempTree[twoDigit] = [nameObj]
        await fsPromises.writeFile(`${rootPath}/${levels.join("/")}/temp_tree.json`,JSON.stringify(tempTree),{flag: "w"})
      }

      await fsPromises.writeFile(`${rootPath}/${levels.join("/")}/index.json`,JSON.stringify(index),{flag: "w"})
    }
    for(const word of name.split("_")) {
      const offset = name.indexOf(word)
      if(isNaN(name.charCodeAt(offset))) continue;
      await addNameToBranch(name, offset, name.charAt(offset))
    }
    callback()
  }
}

consola.info("Preprocessing content")
const nameTempMap = new Map();
const paymentTempMap = new Map();
const content_src = 'content_src'

const alphabet = [...'abcdefghijklmnñopqrstuvwxyz']
await Promise.all(alphabet.map(async letter => {
  await fsPromises.mkdir(`./static/name_search/${letter}`, {recursive:true})
}))

const srcFiles = (await fsPromises.readdir(content_src))
                    .filter(file => path.extname(file).toLowerCase() === ".csv")
await Promise.all(srcFiles.map(file => {
  consola.info("Processing file", file)
  return new Promise((resolve,reject) => {
    const readStream = createReadStream(path.join(content_src,file), 'latin1')
    readStream
      .pipe(csv({delimiter: ";",checkType:true}))
      .pipe(new PaymentsWriter(nameTempMap, paymentTempMap))
      .on('finish', resolve)
      .on('error', reject)
  })
}))
consola.success("Preprocessed content generated")

