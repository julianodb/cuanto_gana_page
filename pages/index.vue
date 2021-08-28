<template>
<div class="container">
  <div class="container">
    <b-field label="Name">
        <b-input v-model="searchedName"></b-input>
    </b-field>
  </div>
  <div
    class="columns"
    v-for="person in persons"
    :key="person.slug">
      <div class="column is-full">
          <b-button
            expanded
            type="is-primary"
            icon="account"
            v-on:click="getMoney(person.slug)">
                  {{person.fullname}}
          </b-button>
      </div>
  </div>
  <person-bar-chart :money="money" />
</div>
</template>

<script>
export default {
  methods: {
    async getMoney(slug) {
      const data = await this.$http.$get(`/${slug}/payments.json`)
      this.money = data
    }
  },
  data: () => ({
    money: {},
    searchedName: "",
    persons: []
  }),
  watch: {
    async searchedName() {
      const names = await this.$content('names').search('fullname',this.searchedName).limit(10).fetch()
      console.log(names)
      this.persons = names
    }
  }
}
</script>
