<template>
<div class="container">
  <div
    class="columns buttons"
    v-for="person in persons"
    :key="person.slug">
      <b-button
        class="column is-full"
        type="is-primary"
        icon="account"
        v-on:click="getMoney(person.slug)">
              {{person.fullname}}
      </b-button>
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
    money: {}
  })
}
</script>
