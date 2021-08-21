<template>
  <div class="container">
    {{person.name}}
  </div>
</template>

<script>
export default {
  asyncData({$content,params}) {
    return $content('names')
            .where({ slug: {$eq: params.name}})
            .fetch()
            .then(result => {
              if(result.length == 1) return {person: result[0]}
    })
  }
}
</script>

<style>

</style>
