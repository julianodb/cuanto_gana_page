<template>
<div class="container">
  <b-menu>
    <b-menu-list label="últimas personas consultadas">
      <b-menu-item
        icon="account"
        tag="nuxt-link"
        :label="person.fullname"
        v-for="person in persons"
        :key="person.slug"
        :to="person.slug">
              {{person.fullname}}
      </b-menu-item>
    </b-menu-list>
  </b-menu>
</div>
</template>

<script>
export default {
  async asyncData({$content}) {
    const names = await $content('names').skip(10).limit(3).fetch()
    return {
      "persons": names
    }
  }
}
</script>
