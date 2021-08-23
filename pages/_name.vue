<template>
  <div class="container">
    <h1 class="title is-1"> {{name}} </h1>
    <div> {{money}} </div>
    <bar-chart :chartData="paymentDataset" options="" />
  </div>
</template>

<script>
import BarChart from '~/components/BarChart.vue'
export default {
  components: { BarChart },
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
  },
  computed: {
    paymentDataset: function() {
      return {
        labels: this.money.map(m=>m.month),
        datasets: [{
          label: 'Remuneración Bruta Mensual',
          data: this.money.map(m=>m.salaryBeforeTaxes),
          }]
      }
    }
  }
}
</script>

<style>

</style>
