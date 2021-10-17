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
                      {{person.replace("_"," ")}}
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
      const searchTerm = slug.slice(0,1)
      //try
      const index = await this.$http.$get(`/name_search/${searchTerm}/index.json`)
      //if(index.children.length == 0)
      const names = await this.$http.$get(`/name_search/${searchTerm}/0.json`)
      this.persons = names.filter(n => n.startsWith(slug))
    }
  }
}
</script>
