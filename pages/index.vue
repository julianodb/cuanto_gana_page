<template>
<div class="container">
  <div class="columns">
    <div class="column is-two-fifths">
      <div class="container">
        <b-field label="Nombre">
            <b-input v-model="searchedName"></b-input>
        </b-field>
      </div>
      <br />
      <div
        class="columns"
        v-for="person in persons"
        :key="person">
          <div class="column is-full">
              <b-button
                expanded
                type="is-primary"
                icon-left="account"
                v-on:click="getMoney(person)">
                      {{person.replace(/_/gu," ").replace(/([\S])([\S]*)/gu, (l0,l1,l2) => `${l1.toUpperCase()}${l2.toLowerCase()}`)}}
              </b-button>
          </div>
      </div>
    </div>
    <div class="column">
      <person-bar-chart :money="money" />
    </div>
  </div>
</div>
</template>

<script>
export default {
  methods: {
    async getMoney(slug) {
      const data = await this.$http.$get(`/person/${slug}/payments.json`)
      this.money = data[slug]
    }
  },
  data: () => ({
    money: {},
    searchedName: "",
    persons: []
  }),
  watch: {
    async searchedName() {
      const maxChars = this.searchedName.length
      if(maxChars <= 0) return this.persons = []
      const slug = this.searchedName.replace(/[^\p{L}]+/gu,"_").toLowerCase()
      //try
      let searchTerm = ""
      let path = ""
      let index
      do {
        searchTerm = slug.slice(0,searchTerm.length + 1)
        path = searchTerm.split("").reduce((acc,curr) => [...acc, acc[acc.length-1]+curr], [""]).slice(1).join("/")
        index = await this.$http.$get(`/name_search/${path}/index.json`)
      } while(searchTerm.length < maxChars && index.children.length > 0 && searchTerm in index.children)
      let names = []
      for(const [i, list] of index.listsMetadata.entries()) {
        const newNames = await this.$http.$get(`/name_search/${path}/${i}.json`)
        names = names.concat(newNames).filter(n => n.includes(slug))
        if(names.length >= 10) break
      }
      this.persons = names.slice(0,10)
    }
  }
}
</script>
