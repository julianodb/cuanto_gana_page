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
        :key="person.slug">
          <div class="column is-full">
              <b-button
                expanded
                type="is-primary"
                icon-left="account"
                v-on:click="getMoney(person.slug)">
                      {{person.fullName}}
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
      const names = await this.$content('names')
                              .search('fullName',this.searchedName)
                              .limit(10)
                              .fetch()
      this.persons = names
    }
  }
}
</script>
