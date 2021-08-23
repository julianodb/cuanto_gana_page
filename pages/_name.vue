<template>
  <div class="container">
    {{person}}
    {{money}}
  </div>
</template>

<script>
export default {
  async asyncData({$content,params}) {
    const person = await $content('names')
            .where({ slug: {$eq: params.name}})
            .fetch()
            .then(result => {
              if(result.length == 1) return result[0]
    })
    const money = await $content(`${params.name}/money`, { deep: true }).fetch()

    return {
      person,
      money
    }
  }
}
</script>

<style>

</style>
