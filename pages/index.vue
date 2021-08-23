<template>
<div class="container">
  <b-menu>
    <b-menu-list label="últimas personas consultadas">
      <b-menu-item
        icon="account"
        tag="nuxt-link"
        :label="person.name"
        v-for="person in persons"
        :key="person.name"
        :to="person.slug">
              {{person.name}}
      </b-menu-item>
    </b-menu-list>
  </b-menu>
</div>
</template>

<script>
export default {
  async asyncData({$content}) {
    const names = await $content('names').fetch()
    return {
      "persons": names
    }
  }
}
</script>
