'use strict';

// Elements
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const resetBtn = document.querySelector('.btn');

// Workout class - parent
class Workout {

    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance; // in km
        this.duration = duration; // min
    }

    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
        return this.description;
    }
}

// Running class - child
class Running extends Workout {
    type = 'running';

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        // min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

// Cycling class - child
class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        // km/hr
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

// App class
class App {

    #map;
    #mapZoom = 13;
    #mapEvent;
    #workouts = [];

    constructor() {

        // get position
        this._getPosition();

        // get local storage
        this._getLocalStorage();


        // attach event listners
        form.addEventListener('submit', this._newWorkout.bind(this));
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        resetBtn.addEventListener('click', this._reset);

        if (this.#workouts.length === 0) {
            resetBtn.classList.add('hidden');
        }
    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), (err) => console.log(err));
        }
    }

    _loadMap(position) {

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const coords = [lat, lng];

        // Map view
        this.#map = L.map('map').setView(coords, this.#mapZoom);

        let greenIcon = L.icon({
            iconUrl: 'https://leafletjs.com/examples/custom-icons/leaf-green.png',
            // shadowUrl: 'https://leafletjs.com/examples/custom-icons/leaf-shadow.png',

            iconSize: [18, 55], // size of the icon
            shadowSize: [30, 34], // size of the shadow
            iconAnchor: [22, 94], // point of the icon which will correspond to marker's location
            shadowAnchor: [4, 62],  // the same for the shadow
            popupAnchor: [-3, -76] // point from which the popup should open relative to the iconAnchor
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        L.marker(coords, { icon: greenIcon }).addTo(this.#map)
            .bindPopup('You are here')
            .openPopup();


        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach((data) => this._renderWorkoutMarker(data));

    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        inputElevation.value = inputDistance.value = inputDuration.value = inputCadence.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);
    }

    _toggleElevationField() {
        inputCadence.closest(".form__row").classList.toggle('form__row--hidden');
        inputElevation.closest(".form__row").classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {
        e.preventDefault();

        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        // geting data
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        let workout;
        const { lat } = this.#mapEvent.latlng;
        const { lng } = this.#mapEvent.latlng;

        // create running obj if type is running
        if (type === 'running') {
            const cadence = +inputCadence.value;
            // validating data
            if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) {
                this._hideForm();
                return alert("The input should be positive number");
            }
            workout = new Running([lat, lng], distance, duration, cadence);
        }

        // create cycling obj if type is cycling
        if (type === 'cycling') {
            const elevation = +inputElevation.value;

            if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration)) {
                this._hideForm();
                return alert("The input should be positive number");
            }

            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        // add new obj to the obj array
        this.#workouts.push(workout);
        if (!(this.#workouts.length === 0)) {
            if (resetBtn.classList.contains('hidden')) resetBtn.classList.remove('hidden');
        }

        // console.log(this.#workouts);

        // render map
        this._renderWorkoutMarker(workout);


        // render to the list
        this._renderWorkout(workout);

        // save to loaclStorage
        this._setLocalStorage();

        // hide and clear inputs
        this._hideForm();
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map)
            .bindPopup(L.popup({
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`,
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup();

        // this.#map.setView(workout.coords, this.#mapZoom);
    }

    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

        if (workout.type === 'running') {
            html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
        }

        if (workout.type === 'cycling') {
            html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
        }

        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e) {

        const workoutEl = e.target.closest('.workout');
        if (!workoutEl) return;

        const workout = this.#workouts.find((work) => work.id === workoutEl.dataset.id);

        this.#map.setView(workout.coords, this.#mapZoom, {
            animate: true,
            pane: {
                duration: 1
            }
        });
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));

        if (!data) return;

        this.#workouts = data;
        this.#workouts.forEach((data) => this._renderWorkout(data));
    }

    _reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }
}

// reset event

const app = new App();
