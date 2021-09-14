const extract_fullname = (obj) => [obj.Nombres, obj.Paterno, obj.Materno].join(" ")
const create_slug_from_full_name = (str) => str.replace(/[^\p{L}]+/gu,"_").toLowerCase()
const month_to_number = new Map([
  ["Enero", 1],
  ["Febrero", 2],
  ["Marzo", 3],
  ["Abril", 4],
  ["Mayo", 5],
  ["Junio", 6],
  ["Julio", 7],
  ["Agosto", 8],
  ["Septiembre", 9],
  ["Octubre", 10],
  ["Noviembre", 11],
  ["Diciembre", 12]
])

export default class ContrataPayment {
  internalPath;
  institution;
  institutionCode;
  publicationDate;
  year;
  monthString;
  contractType;
  name;
  surname1;
  surname2;
  salaryGrade;
  qualificationType;
  position;
  region;
  extraBenefits;
  currency;
  salaryBeforeTaxes;
  salaryAfterTaxes;
  bonusDayTime;
  extraHoursDayTime;
  bonusNightTime;
  extraHoursNightTime;
  bonusHolidays;
  extraHoursHolidays;
  startDate;
  endDate;
  obs;
  link;
  travelExpenses;
  activated;
  fullName;
  slug;
  month;

  constructor(rawData) {
    this.internalPath =         rawData["camino"]
    this.institution =          rawData["organismo_nombre"]
    this.institutionCode =      rawData["organismo_codigo"]
    this.publicationDate =      rawData["fecha_publicacion"]
    this.year =                 rawData["anyo"]
    this.monthString =          rawData["Mes"]
    this.contractType =         rawData["Tipo Estamento"]
    this.name =                 rawData["Nombres"]
    this.surname1 =             rawData["Paterno"]
    this.surname2 =             rawData["Materno"]
    this.salaryGrade =          rawData["grado_eus"]
    this.qualificationType =    rawData["tipo_calificacionp"]
    this.position =             rawData["Tipo cargo"]
    this.region =               rawData["region"]
    this.extraBenefits =        rawData["asignaciones"]
    this.currency =             rawData["Tipo Unidad monetaria"]
    this.salaryBeforeTaxes =    rawData["remuneracionbruta_mensual"]
    this.salaryAfterTaxes =     rawData["remuliquida_mensual"]
    this.bonusDayTime =         rawData["Pago extra diurnas"]
    this.extraHoursDayTime =    rawData["Horas extra diurnas"]
    this.bonusNightTime =       rawData["Pago extra nocturnas"]
    this.extraHoursNightTime =  rawData["Horas extra nocturnas"]
    this.bonusHolidays =        rawData["Pago extra festivas"]
    this.extraHoursHolidays =   rawData["Horas extra festivas"]
    this.startDate =            rawData["fecha_ingreso"]
    this.endDate =              rawData["fecha_termino"]
    this.obs =                  rawData["observaciones"]
    this.link =                 rawData["enlace"]
    this.travelExpenses =       rawData["viaticos"]
    this.activated =            rawData["activado"]
    this.fullName =             extract_fullname(rawData)
    this.slug =                 create_slug_from_full_name(this.fullName)
    this.month =                month_to_number.get(this.monthString) ?? 0
  }
}
