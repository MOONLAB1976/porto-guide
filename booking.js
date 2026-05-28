const pricing = {
  baseFare: 12,
  perKm: 1.35,
  minimumFare: 22,
  airportSurcharge: 6,
  nightSurcharge: 5,
  extraPassengerFee: 4
};

const bookingContent = {
  en: {
    loading: "Calculating route and estimated fare...",
    error: "We could not calculate this route right now. Please check the addresses or contact us directly by WhatsApp.",
    readyTitle: "Estimated journey",
    emptyTitle: "Route estimate",
    emptyText: "Fill in the trip details to calculate distance, duration and estimated price before booking.",
    estimateLabel: "Estimated total",
    distance: "Distance",
    duration: "Estimated time",
    pricingModel: "Pricing model",
    tripType: "Trip type",
    contact: "Contact number",
    fareRule: `Base fare €${pricing.baseFare} + €${pricing.perKm.toFixed(2)}/km`,
    night: "Night supplement after 21:00 may apply",
    airport: "Airport fee included",
    passengers: "Passengers",
    date: "Date",
    request: "Request this transfer on WhatsApp",
    note: "This is a clear estimate based on the real driving route. Final confirmation is sent by message before the pickup.",
    types: {
      city: "City transfer",
      airport: "Airport transfer",
      douro: "Douro / wine tour transfer"
    }
  },
  pt: {
    loading: "A calcular rota e valor estimado...",
    error: "Não foi possível calcular esta rota agora. Verifique as moradas ou contacte diretamente por WhatsApp.",
    readyTitle: "Viagem estimada",
    emptyTitle: "Estimativa da rota",
    emptyText: "Preencha os detalhes da viagem para calcular distância, duração e valor estimado antes da reserva.",
    estimateLabel: "Total estimado",
    distance: "Distância",
    duration: "Tempo estimado",
    pricingModel: "Modelo de preço",
    tripType: "Tipo de serviço",
    contact: "Número de contacto",
    fareRule: `Taxa base €${pricing.baseFare} + €${pricing.perKm.toFixed(2)}/km`,
    night: "Pode aplicar suplemento noturno após as 21:00",
    airport: "Inclui taxa de aeroporto",
    passengers: "Passageiros",
    date: "Data",
    request: "Pedir este transfer por WhatsApp",
    note: "Esta é uma estimativa clara baseada na rota real de condução. A confirmação final é enviada por mensagem antes da recolha.",
    types: {
      city: "Transfer urbano",
      airport: "Transfer aeroporto",
      douro: "Transfer Douro / vinho"
    }
  },
  fr: {
    loading: "Calcul de l'itinéraire et du tarif estimé...",
    error: "Impossible de calculer cet itinéraire pour le moment. Vérifiez les adresses ou contactez-nous directement par WhatsApp.",
    readyTitle: "Trajet estimé",
    emptyTitle: "Estimation de l'itinéraire",
    emptyText: "Renseignez les détails du trajet pour calculer la distance, la durée et le tarif estimé avant la réservation.",
    estimateLabel: "Total estimé",
    distance: "Distance",
    duration: "Durée estimée",
    pricingModel: "Modèle tarifaire",
    tripType: "Type de service",
    contact: "Numéro de contact",
    fareRule: `Tarif de base €${pricing.baseFare} + €${pricing.perKm.toFixed(2)}/km`,
    night: "Supplément de nuit possible après 21h00",
    airport: "Frais aéroport inclus",
    passengers: "Passagers",
    date: "Date",
    request: "Demander ce transfert sur WhatsApp",
    note: "Il s'agit d'une estimation claire basée sur l'itinéraire réel en voiture. La confirmation finale est envoyée par message avant la prise en charge.",
    types: {
      city: "Transfert urbain",
      airport: "Transfert aéroport",
      douro: "Transfert Douro / vin"
    }
  }
};

function bookingLanguage() {
  return document.body.dataset.lang || "en";
}

function bookingText() {
  return bookingContent[bookingLanguage()] || bookingContent.en;
}

function formatCurrency(value) {
  return new Intl.NumberFormat(bookingLanguage(), {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
}

function formatDistance(km) {
  return `${km.toFixed(1)} km`;
}

function formatDuration(minutes) {
  const totalMinutes = Math.round(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) {
    return `${mins} min`;
  }
  return `${hours} h ${mins} min`;
}

function isNight(timeValue) {
  if (!timeValue) {
    return false;
  }
  const hour = Number(timeValue.split(":")[0]);
  return hour >= 21 || hour < 7;
}

async function geocodeAddress(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=pt&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("Geocoding failed");
  }

  const results = await response.json();
  if (!results.length) {
    throw new Error("Address not found");
  }

  return {
    lat: Number(results[0].lat),
    lon: Number(results[0].lon),
    label: results[0].display_name
  };
}

async function getDrivingRoute(start, end) {
  const routeUrl = `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=false&alternatives=false&steps=false`;
  const response = await fetch(routeUrl);
  if (!response.ok) {
    throw new Error("Route lookup failed");
  }

  const data = await response.json();
  const route = data.routes && data.routes[0];
  if (!route) {
    throw new Error("No route found");
  }

  return {
    distanceKm: route.distance / 1000,
    durationMinutes: route.duration / 60
  };
}

function calculatePrice(distanceKm, tripType, passengers, tripTime) {
  let total = pricing.baseFare + distanceKm * pricing.perKm;

  if (tripType === "airport") {
    total += pricing.airportSurcharge;
  }

  if (tripType === "douro") {
    total += 12;
  }

  if (Number(passengers) > 4) {
    total += pricing.extraPassengerFee;
  }

  if (isNight(tripTime)) {
    total += pricing.nightSurcharge;
  }

  return Math.max(total, pricing.minimumFare);
}

function setResultState(ready) {
  const empty = document.querySelector(".result-empty");
  const result = document.querySelector(".result-ready");
  if (!empty || !result) {
    return;
  }

  empty.classList.toggle("active", !ready);
  result.classList.toggle("active", ready);
}

function setStatus(message) {
  const status = document.getElementById("booking-status");
  if (status) {
    status.textContent = message;
  }
}

function fillSummary(data) {
  const text = bookingText();
  document.getElementById("result-title-ready").textContent = text.readyTitle;
  document.getElementById("estimate-label").textContent = text.estimateLabel;
  document.getElementById("estimate-price").textContent = formatCurrency(data.price);
  document.getElementById("summary-distance").textContent = formatDistance(data.distanceKm);
  document.getElementById("summary-duration").textContent = formatDuration(data.durationMinutes);
  document.getElementById("summary-pricing").textContent = text.fareRule;
  document.getElementById("summary-type").textContent = text.types[data.tripType];
  document.getElementById("summary-contact").textContent = data.phone;
  document.getElementById("summary-passengers").textContent = `${data.passengers}`;
  document.getElementById("summary-date").textContent = `${data.date || "-"} ${data.time || ""}`.trim();
  document.getElementById("result-note").textContent = text.note;

  const summary = [
    `Pickup: ${data.pickup}`,
    `Drop-off: ${data.dropoff}`,
    `Distance: ${formatDistance(data.distanceKm)}`,
    `Duration: ${formatDuration(data.durationMinutes)}`,
    `Estimated price: ${formatCurrency(data.price)}`,
    `Passengers: ${data.passengers}`,
    `Date: ${data.date || "-"} ${data.time || ""}`.trim()
  ].join("\n");

  const whatsapp = `https://wa.me/351916261117?text=${encodeURIComponent(summary)}`;
  const requestLink = document.getElementById("request-link");
  requestLink.href = whatsapp;
  requestLink.textContent = text.request;
}

function prepareStaticTexts() {
  const text = bookingText();
  document.getElementById("result-title-empty").textContent = text.emptyTitle;
  document.getElementById("result-empty-text").textContent = text.emptyText;
  document.getElementById("pricing-rule").textContent = text.fareRule;
  document.getElementById("pricing-night").textContent = text.night;
  document.getElementById("pricing-airport").textContent = text.airport;
  document.getElementById("label-distance").textContent = text.distance;
  document.getElementById("label-duration").textContent = text.duration;
  document.getElementById("label-pricing").textContent = text.pricingModel;
  document.getElementById("label-type").textContent = text.tripType;
  document.getElementById("label-contact").textContent = text.contact;
  document.getElementById("label-passengers").textContent = text.passengers;
  document.getElementById("label-date").textContent = text.date;
  setStatus("");
}

async function handleBookingSubmit(event) {
  event.preventDefault();
  const text = bookingText();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());

  setResultState(false);
  setStatus(text.loading);

  try {
    const start = await geocodeAddress(data.pickup);
    const end = await geocodeAddress(data.dropoff);
    const route = await getDrivingRoute(start, end);
    const price = calculatePrice(route.distanceKm, data.tripType, data.passengers, data.time);

    fillSummary({
      pickup: data.pickup,
      dropoff: data.dropoff,
      tripType: data.tripType,
      passengers: data.passengers,
      date: data.date,
      time: data.time,
      phone: data.phone,
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      price
    });

    setResultState(true);
    setStatus("");
  } catch (error) {
    setStatus(text.error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("booking-form");
  if (!form) {
    return;
  }

  prepareStaticTexts();
  setResultState(false);
  form.addEventListener("submit", handleBookingSubmit);
});
