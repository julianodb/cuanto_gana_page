<template>
<div class="container">
  <div class="container">
    <b-field label="Name">
        <b-input v-model="name"></b-input>
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
  async asyncData({$content}) {
    const names = await $content('names').skip(10).limit(3).fetch()
    return {
      "persons": names
    }
  },
  methods: {
    async getMoney(slug) {
      const data = await this.$http.$get(`/${slug}/payments.json`)
      this.money = data
    }
  },
  data: () => ({
    money: {},
    name: ""
  })
}
</script>
