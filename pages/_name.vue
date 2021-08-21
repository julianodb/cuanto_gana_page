<template>
  <div class="container">
    {{this.name}}
  </div>
</template>

<script>
export default {
  async asyncData({params}) {
    const name = params.name
    return { name }
  }
}
</script>

<style>

</style>
