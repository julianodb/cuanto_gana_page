<template>
  <div class="container">
    <h1 class="title is-1"> {{name}} </h1>
    <bar-chart :chartData="paymentDataset" :options="chartOptions" />
  </div>
</template>

<script>
import BarChart from '~/components/BarChart.vue'

const graphColors = [
  'rgba(255, 99, 132, 0.2)',
  'rgba(255, 159, 64, 0.2)',
  'rgba(255, 205, 86, 0.2)',
  'rgba(75, 192, 192, 0.2)',
  'rgba(54, 162, 235, 0.2)',
  'rgba(153, 102, 255, 0.2)',
  'rgba(201, 203, 207, 0.2)'
]
export default {
  components: { BarChart },
  async asyncData({$content,params}) {
    const person = await $content('names')
            .where({ slug: {$eq: params.slug}})
            .fetch()
            .then(result => {
              if(result.length >= 1) return result[0]
    })
    const payments = await $content('', { deep:true })
            .where({
              extension:{$eq:".csv"}
            })
            .fetch()
            .then(files => files.map(file=>file.body).flat() )
            .then(result => result.filter(payment =>
                payment.Nombres === person.name &&
                payment.Paterno === person.surname1 &&
                payment.Materno === person.surname2
            ))
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
      name: person.fullname,
      money: payments
    }
  },
  data: function() {
    return {
      monthsToShow: 10,
      currentMonth: 1,
      chartOptions: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    }
  },
  computed: {
    paymentDataset: function() {
      return {
        labels: this.money.map(m=>m.month),
        datasets: [
          {
            label: 'Remuneración Bruta Mensual',
            data: this.money.map(m=>m.salaryBeforeTaxes),
            backgroundColor: graphColors[0]
          },
          {
            label: 'Remuneración Liquida Mensual',
            data: this.money.map(m=>m.salaryAfterTaxes),
            backgroundColor: graphColors[1]
          },
          {
            label: 'Pago extra diurnas',
            data: this.money.map(m=>m.bonusDayTime),
            backgroundColor: graphColors[2]
          },
          {
            label: 'Pago extra nocturnas',
            data: this.money.map(m=>m.bonusNightTime),
            backgroundColor: graphColors[3]
          },
          {
            label: 'Pago extra festivas',
            data: this.money.map(m=>m.bonusHolidays),
            backgroundColor: graphColors[4]
          }
          ]
      }
    }
  }
}
</script>

<style>

</style>
