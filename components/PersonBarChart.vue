<script>
import { Bar } from 'vue-chartjs'

const graphColors = [
  'rgba(54, 162, 235, 0.2)',
  'rgba(75, 192, 192, 0.2)',
  'rgba(255, 205, 86, 0.2)',
  'rgba(255, 159, 64, 0.2)',
  'rgba(255, 99, 132, 0.2)',
  'rgba(153, 102, 255, 0.2)',
  'rgba(201, 203, 207, 0.2)'
]

export default {
  extends: Bar,
  props: ['money'],
  mounted () {
    this.renderChart(this.paymentDataset, this.options)
  },
  watch: {
    money() {
      this.renderChart(this.paymentDataset, this.options)
    }
  },
  data: () => ({
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  }),
  computed: {
    paymentsArray: function() {
      return Object.entries(this.money)
        .reduce((acc,[year, monthObj])=> [...acc,
          Object.entries(monthObj)
            .map(([month,payment])=>payment)
        ],[]).flat()
    },
    paymentDataset: function() {
      return {
        labels: this.paymentsArray.map(payment => [payment.monthString, payment.year].join(" / ")),
        datasets: [
          {
            label: 'Remuneración Bruta Mensual',
            data: this.paymentsArray.map(m=>m.salaryBeforeTaxes),
            backgroundColor: graphColors[0]
          },
          {
            label: 'Remuneración Liquida Mensual',
            data: this.paymentsArray.map(m=>m.salaryAfterTaxes),
            backgroundColor: graphColors[1]
          },
          {
            label: 'Pago extra diurnas',
            data: this.paymentsArray.map(m=>m.bonusDayTime),
            backgroundColor: graphColors[2]
          },
          {
            label: 'Pago extra nocturnas',
            data: this.paymentsArray.map(m=>m.bonusNightTime),
            backgroundColor: graphColors[3]
          },
          {
            label: 'Pago extra festivas',
            data: this.paymentsArray.map(m=>m.bonusHolidays),
            backgroundColor: graphColors[4]
          }
          ]
      }
    }
  }
}
</script>
