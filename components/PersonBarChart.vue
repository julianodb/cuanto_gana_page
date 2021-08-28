<script>
import { Bar } from 'vue-chartjs'

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
  extends: Bar,
  props: ['money'],
  mounted () {
    console.log(this.paymentDataset)
    this.renderChart(this.paymentDataset, this.options)
  },
  watch: {
    money() {
      console.log(this.paymentDataset)
      this.renderChart(this.paymentDataset, this.options)
    }
  },
  data: function() {
    return {
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    }
  },
  computed: {
    onlyPayments: function() {
      return Object.entries(this.money)
        .reduce((acc,[year, monthObj])=> [...acc,
          Object.entries(monthObj)
            .map(([month,payment])=>({year: payment.anyo,
              month: payment.Mes,
              salaryBeforeTaxes: payment.remuneracionbruta_mensual,
              salaryAfterTaxes: payment.remuliquida_mensual,
              bonusDayTime: payment["Pago extra diurnas"],
              bonusNightTime: payment["Pago extra nocturnas"],
              bonusHolidays: payment["Pago extra festivas"]
            }))
        ],[]).flat()
    },
    paymentDataset: function() {
      return {
        labels: Object.entries(this.money).reduce((acc,[year, monthObj])=>[...acc,Object.entries(monthObj).map(([month,payment])=> [year, month].join(" "))],[]).flat(),
        datasets: [
          {
            label: 'Remuneración Bruta Mensual',
            data: this.onlyPayments.map(m=>m.salaryBeforeTaxes),
            backgroundColor: graphColors[0]
          },
          {
            label: 'Remuneración Liquida Mensual',
            data: this.onlyPayments.map(m=>m.salaryAfterTaxes),
            backgroundColor: graphColors[1]
          },
          {
            label: 'Pago extra diurnas',
            data: this.onlyPayments.map(m=>m.bonusDayTime),
            backgroundColor: graphColors[2]
          },
          {
            label: 'Pago extra nocturnas',
            data: this.onlyPayments.map(m=>m.bonusNightTime),
            backgroundColor: graphColors[3]
          },
          {
            label: 'Pago extra festivas',
            data: this.onlyPayments.map(m=>m.bonusHolidays),
            backgroundColor: graphColors[4]
          }
          ]
      }
    }
  }
}
</script>
