<template>
<div class="container">
  <div class="list is-hoverable">
    <nuxt-link
      v-for="person in persons"
      :key="person.name"
      :to="person.slug"
      class = "list-item">
        {{person.name}}
    </nuxt-link>
  </div>
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
