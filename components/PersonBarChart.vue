<script>
import { HorizontalBar } from 'vue-chartjs'

const graphColors = [
  'rgba(54, 162, 235, 0.2)',
  'rgba(75, 192, 192, 0.2)',
  'rgba(255, 205, 86, 0.2)',
  'rgba(255, 159, 64, 0.2)',
  'rgba(255, 99, 132, 0.2)',
  'rgba(153, 102, 255, 0.2)',
  'rgba(201, 203, 207, 0.2)'
]

function num_string_to_currency(value) {
  var formatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
    maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
  });
  try{
    const val = parseInt(value)
    return formatter.format(val);
  } catch(e) {
    console.log(e)
    return ""
  }
}

export default {
  extends: HorizontalBar,
  props: ['money'],
  mounted () {
    this.renderChart(this.paymentDataset, this.options)
  },
  watch: {
    money() {
      this.renderChart(this.paymentDataset, this.options)
    }
  },
  computed: {
    paymentsArray: function() {
      return Object.entries(this.money)
        .reduce((acc,[year, monthObj])=> [...acc,
          Object.entries(monthObj)
            .map(([month,payment])=>payment)
        ],[]).flat()
    },
    personName: function() { return this.paymentsArray[0]?.cleanFullName ?? ""},
    options: function() {
      return {
        title: {
            display: true,
            text: this.personName,
            fontSize: 15
        },
        legend: {
          position: 'bottom'
        },
        tooltips: {
          intersect: false,
          callbacks: {
            label: (tooltipItem, data) => {
              const label = data.datasets[tooltipItem.datasetIndex].label || '';
              const value = num_string_to_currency(tooltipItem.xLabel)
              return `${label}: ${value}`
            }
          }
        },
        scales: {
          xAxes: [{
            stacked:true,
            ticks: {
              callback: (value, index, values) => num_string_to_currency(value)
            }
          }]
        },
        datasets: {
          bar: {
            barPercentage: 1.0,
            borderWidth: 2.0
          }
        }
      }
    },
    paymentDataset: function() {
      return {
        labels: this.paymentsArray.map(payment => [payment.monthString, payment.year].join(" / ")),
        datasets: [
          {
            label: 'Remuneración Bruta Mensual',
            data: this.paymentsArray.map(m=>m.salaryBeforeTaxes),
            backgroundColor: graphColors[0],
            stack: "0"
          },
          {
            label: 'Remuneración Liquida Mensual',
            data: this.paymentsArray.map(m=>m.salaryAfterTaxes),
            backgroundColor: graphColors[1],
            stack: "1"
          },
          {
            label: 'Pago extra diurnas',
            data: this.paymentsArray.map(m=>m.bonusDayTime),
            backgroundColor: graphColors[2],
            stack: "1"
          },
          {
            label: 'Pago extra nocturnas',
            data: this.paymentsArray.map(m=>m.bonusNightTime),
            backgroundColor: graphColors[3],
            stack: "1"
          },
          {
            label: 'Pago extra festivas',
            data: this.paymentsArray.map(m=>m.bonusHolidays),
            backgroundColor: graphColors[4],
            stack: "1"
          }
          ]
      }
    }
  }
}
</script>
