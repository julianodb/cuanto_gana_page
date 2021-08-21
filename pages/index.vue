<template>
<div class="container">
  <div class="list is-hoverable">
    <nuxt-link
      v-for="name in testNames"
      :key="name"
      :to="name"
      class = "list-item">
        {{name}}
    </nuxt-link>
  </div>
</div>
</template>

<script>
export default {
  data() {
    return {
      testNames: [ "name1", "name2", "name3"]
    }
  }
}
</script>
