<template>
  <div class="container">
    <h1 class="title is-1"> {{name}} </h1>
    <div> {{money}} </div>
  </div>
</template>

<script>
export default {
  async asyncData({$content,params}) {
    const person = await $content('names')
            .where({ slug: {$eq: params.name}})
            .fetch()
            .then(result => {
              if(result.length >= 1) return result[0]
    })
    const payments = await $content(`${params.name}/money`, { deep: true })
            .fetch()
            .then(result => {
              return Array.isArray(result) ? result : [result]
            })
            .then(result => result.map(payment => {
              return {
                year: payment.anyo,
                month: payment.Mes,
                salaryBeforeTaxes: payment.remuneracionbruta_mensual,
                salaryAfterTaxes: payment.remuliquida_mensual,
                bonusDayTime: payment["Pago extra diurnas"],
                bonusNightTime: payment["Pago extra nocturnas"],
                bonusHolidays: payment["Pago extra festivas"]
              }
            }))

    return {
      name: person.name,
      money: payments
    }
  },
  data: function() {
    return {
      monthsToShow: 10,
      currentMonth: 1
    }
  }
}
</script>

<style>

</style>
