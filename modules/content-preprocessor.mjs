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
const treeThreshold = 25
const rootPath = "./static/name_search"

class PaymentsWriter extends Writable {
  constructor(nameTempMap, paymentTempMap) {
    super()
    this.nameTempMap = nameTempMap
    this.paymentTempMap = paymentTempMap
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
    const name = payment.cleanFullName

    if(this.nameTempMap.has(payment.slug)) {callback(); return;}
    this.nameTempMap.set(payment.slug, true);

    if(isNaN(name.charCodeAt(0))) {callback(); return;}
    const initialLetter = name.charAt(0)

    const addNameToBranch = async (nameToAdd, ...levels) => {
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

        if(list.last < wordToAdd && list.count >= treeThreshold && index.countOfNames != treeThreshold) continue

        const currListOldContent = JSON.parse(await fsPromises.readFile(`${rootPath}/${levels.join("/")}/${i}.json`))
        allContent = [...currListOldContent, wordToAdd].sort()
        const currListNewContent = allContent.slice(0,treeThreshold)

        // update children
        if(index.countOfNames == treeThreshold) {
          const tree = allContent.reduce( (acc, curr) =>{
            const twoDigit = curr.slice(0,levels.length+1)
            if (twoDigit in acc && !acc[twoDigit].includes(curr)) acc[twoDigit] = [...acc[twoDigit], curr]
            else acc[twoDigit] = [curr]
            return acc
          }, {})
          for(const child in tree) {
            for(const childName of tree[child]) await addNameToBranch(childName, ...levels, child)
            if(!index.children.includes(child)) index.children = [...index.children, child].sort()
          }
        }

        if(list.last < wordToAdd  && list.count >= treeThreshold) continue
        await update_list(`${rootPath}/${levels.join("/")}`,currListNewContent, i, index.listsMetadata)
        wordToAdd = allContent[allContent.length-1]

      }
      if(index.listsMetadata.length == 0 ||
        (index.listsMetadata[index.listsMetadata.length-1].count >= treeThreshold &&
         index.listsMetadata[index.listsMetadata.length-1].last != wordToAdd)) {
          await update_list(`${rootPath}/${levels.join("/")}`,[wordToAdd], index.listsMetadata.length, index.listsMetadata)
        }
      if(index.countOfNames >= treeThreshold) await addNameToBranch(nameToAdd, ...levels, nameToAdd.slice(0,levels.length+1))

      await fsPromises.writeFile(`${rootPath}/${levels.join("/")}/index.json`,JSON.stringify(index),{flag: "w"})
    }
    await addNameToBranch(name, initialLetter)
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

