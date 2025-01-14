import { WeatherApi } from './weatherApi';
import { createColumn, createElement, createRow, isDefined } from '../../utils';
import { Modal, Notification, Spinner } from '../../shared';
import { WEATHER_COUNTRY_KEY_LS, WEATHER_COUNTRY_LABEL_LS } from './constants';
import './weather.css';

export class Weather {
    constructor() {
        this._viewElement = document.querySelector('#main');
        this._api = new WeatherApi();
    }

    async start() {
        this._createMainContainer();
        if (this._isLocalStorageSet()) {
            await this._refreshOrCreateWeatherContent();
        } else {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    await this._getGeolocationDataAndCreateContent(),
                    async () => await this._refreshOrCreateWeatherContent(true)
                );
            } else {
                await this._refreshOrCreateWeatherContent(true);
            }
        }
    }

    async _refreshOrCreateWeatherContent(withDefaultLocation = false) {
        const spinner = new Spinner();
        try {
            spinner.showSpinner();
            if (withDefaultLocation) {
                this._setLocalStorageValues();
            }
            await this._fetchDataAndCreateContent();
        } catch (error) {
            new Notification().showError('Fetch weather data error', error);
        } finally {
            spinner.removeSpinner();
        }
    }

    async _getGeolocationDataAndCreateContent() {
        return async (position) => {
            const spinner = new Spinner();
            spinner.showSpinner();
            try {
                const response = await this._api.getKeyByGeolocation(
                    position.coords.latitude,
                    position.coords.longitude
                );
                this._setLocalStorageValues(
                    response.Key,
                    `${response.LocalizedName}, ${response.AdministrativeArea.LocalizedName}, ${response.Country.LocalizedName}`
                );
            } catch (error) {
                new Notification().showError('Fetch geolocation data error', error);
                this._setLocalStorageValues();
            } finally {
                await this._fetchDataAndCreateContent();
                spinner.removeSpinner();
            }
        };
    }

    _isLocalStorageSet() {
        return (
            isDefined(localStorage.getItem(WEATHER_COUNTRY_KEY_LS)) &&
            isDefined(localStorage.getItem(WEATHER_COUNTRY_LABEL_LS))
        );
    }

    async _fetchDataAndCreateContent() {
        await this._fetchData();
        this._createWeatherContainer();
    }

    _setLocalStorageValues(key = '274663', label = 'Warsaw, Masovia, Poland') {
        localStorage.setItem(WEATHER_COUNTRY_KEY_LS, key);
        localStorage.setItem(WEATHER_COUNTRY_LABEL_LS, label);
    }

    async _fetchData() {
        this._fiveDayWeather = await this._api.getFiveDayWeather(
            localStorage.getItem(WEATHER_COUNTRY_KEY_LS)
        );
        this._currentDayWeather = await this._api.getCurrentDayWeather(
            localStorage.getItem(WEATHER_COUNTRY_KEY_LS)
        );
        this._currentLocationInfo = await this._api.getCurrentLocationInfo(
            localStorage.getItem(WEATHER_COUNTRY_KEY_LS)
        );
        this._hourlyWeather = await this._api.getHourlyWeather(
            localStorage.getItem(WEATHER_COUNTRY_KEY_LS)
        );
    }

    _createMainContainer() {
        this._container = createElement('div', { class: 'weather__main-container' });
        this._viewElement.append(this._container);
    }

    _createToday() {
        const currentDayDiv = createElement('div');
        currentDayDiv.append(
            this._createCurrentDayInfo(),
            this._createCurrentDayWeather(),
            this._createHourlyCurrentDayWeather()
        );
        this._weatherContainer.append(currentDayDiv);
    }

    _createCurrentDayInfo() {
        const currentDayInfoDiv = createElement('div', { class: 'd-flex flex-row' });
        currentDayInfoDiv.append(this._createTodayInfoBox(), this._createSettingsContainer());
        return currentDayInfoDiv;
    }

    _createTitle() {
        const title = createElement('h1');
        title.innerText = `Weather in ${this._currentLocationInfo.LocalizedName}`;
        return title;
    }

    _createInfoContent() {
        const infoContentDiv = createElement('div');
        infoContentDiv.innerText = this._fiveDayWeather.Headline.Text;
        return infoContentDiv;
    }

    _createTodayInfoBox() {
        const todayInfoBox = createElement('div', { class: 'weather__element flex-grow-1 p-3' });
        todayInfoBox.append(this._createTitle(), this._createInfoContent());
        return todayInfoBox;
    }

    _createCurrentDayWeather() {
        const currentDayWeatherDiv = createElement('div', {
            class: 'd-flex align-items-center weather__element weather__element--center',
        });

        const dailyForecast = this._fiveDayWeather.DailyForecasts[0];

        currentDayWeatherDiv.append(
            this._createWeatherElement(
                `${this._currentDayWeather[0].Temperature.Metric.Value}°C`,
                dailyForecast.Day.Icon,
                `↑ ${dailyForecast.Temperature.Maximum.Value}`,
                `↓ ${dailyForecast.Temperature.Minimum.Value}`,
                true
            )
        );

        return currentDayWeatherDiv;
    }

    _createHourlyCurrentDayWeather() {
        const hourlyCurrentDayWeatherDiv = createElement('div', {
            class: 'd-flex flex-column align-items-start justify-content-center weather__element py-4',
        });
        hourlyCurrentDayWeatherDiv.append(
            createElement('h2', { class: 'ps-3' }, null, 'Hourly Weather')
        );

        const hourlyDiv = createElement('div', {
            class: 'd-flex justify-content-between col-12 px-3 ',
        });

        for (let i = 1; i <= 7; i += 2) {
            const parentElement = createElement('div', { class: 'd-flex flex-column' });

            const tempElement = createElement('div', { class: 'fs-5 fw-bold text-center' });
            tempElement.append(`${this._hourlyWeather[i].Temperature.Value}°C`);
            parentElement.append(tempElement);

            const hourElement = createElement('div', { class: 'text-center' });
            hourElement.append(
                `${String(new Date(this._hourlyWeather[i].DateTime).getHours()).padStart(
                    2,
                    '0'
                )}:00`
            );
            parentElement.append(hourElement);
            hourlyDiv.append(parentElement);
        }

        hourlyCurrentDayWeatherDiv.append(hourlyDiv);
        return hourlyCurrentDayWeatherDiv;
    }

    _createNextDays() {
        const nextDaysDiv = createElement('div', {
            class: 'd-flex justify-content-center flex-wrap',
        });
        this._fiveDayWeather.DailyForecasts.forEach((dailyData) => {
            const column = createColumn();
            column.append(
                this._createWeatherElement(
                    new Date(dailyData.Date).getDay(),
                    dailyData.Day.Icon,
                    dailyData.Temperature.Maximum.Value,
                    dailyData.Temperature.Minimum.Value
                )
            );
            nextDaysDiv.append(column);
        });

        this._weatherContainer.append(nextDaysDiv);
    }

    _createWeatherElement(
        firstElement,
        icon,
        maxTemperature,
        minTemperature,
        isHorizontal = false
    ) {
        const weatherElement = isHorizontal
            ? createElement('div', {
                  class: 'row d-flex align-items-center justify-content-center m-5',
              })
            : createElement('div', {
                  class: 'd-flex flex-column align-items-center justify-content-center weather__element p-3',
              });

        weatherElement.append(
            this._createFirstElement(firstElement, isHorizontal),
            this._createWeatherIcon(icon, isHorizontal),
            this._createTemperatureRange(maxTemperature, minTemperature, isHorizontal)
        );

        return weatherElement;
    }

    _createTemperatureRange(maxTemperature, minTemperature, isHorizontal = false) {
        const temperatureRangeDiv = isHorizontal
            ? createElement('div', { class: 'col-12 col-sm-4 weather__element--center' })
            : createRow();

        const maxTempDiv = this._createTemperature(maxTemperature);
        maxTempDiv.classList.add('fw-bold');

        temperatureRangeDiv.append(maxTempDiv, this._createTemperature(minTemperature));

        return temperatureRangeDiv;
    }

    _createTemperature(temperature, isHorizontal = false) {
        const temperatureDiv = isHorizontal ? createElement('div') : createColumn();
        temperatureDiv.innerText = `${temperature}°C`;
        return temperatureDiv;
    }

    _createFirstElement(value, isHorizontal = false) {
        const firstElementDiv = isHorizontal
            ? createElement('div', {
                  class: 'fs-1 fw-bold col-12 col-sm-4 weather__element--center',
              })
            : createElement('div');

        switch (value) {
            case 0:
                firstElementDiv.innerText = 'Sun';
                break;
            case 1:
                firstElementDiv.innerText = 'Mon';
                break;
            case 2:
                firstElementDiv.innerText = 'Tue';
                break;
            case 3:
                firstElementDiv.innerText = 'Wed';
                break;
            case 4:
                firstElementDiv.innerText = 'Thu';
                break;
            case 5:
                firstElementDiv.innerText = 'Fri';
                break;
            case 6:
                firstElementDiv.innerText = 'Sat';
                break;
            default:
                firstElementDiv.innerText = value;
                break;
        }

        return firstElementDiv;
    }

    _createWeatherIcon(iconId, isHorizontal = false) {
        const weatherIconDiv = isHorizontal
            ? createElement('div', { class: 'col-12 col-sm-4 weather__element--center' })
            : createElement('div');
        const img = createElement('img', {
            src: `https://developer.accuweather.com/sites/default/files/${String(iconId).padStart(
                2,
                '0'
            )}-s.png`,
        });
        weatherIconDiv.appendChild(img);
        return weatherIconDiv;
    }

    _createSettingsContainer() {
        const modalId = 'weatherModal';
        if (!isDefined(document.getElementById(modalId))) {
            new Modal(
                modalId,
                'Weather settings',
                this._createSettingsBody(),
                this._createSearchCountrySaveAndCloseButton()
            ).create();
        }
        const settingsButtonContainer = createElement('div', { class: 'd-flex weather__element' });
        const settingsButton = Modal.createModalHandlerButton(modalId, {
            class: 'btn weather__settings__button justify-content-center align-items-center',
        });
        settingsButton.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" class="bi bi-gear" viewBox="0 0 16 16">\n' +
            '  <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>\n' +
            '  <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>\n' +
            '</svg>';
        settingsButtonContainer.append(settingsButton);
        return settingsButtonContainer;
    }

    _createSettingsBody() {
        this._settingsBody = createElement('div', { class: 'container' });
        this._createSettingsSearchForm();
        return this._settingsBody;
    }

    _createSettingsSearchForm() {
        this._setingsFormElement = createElement('form', {
            class: 'row',
        });

        this._createSearchCountryInput();

        this._settingsBody.append(this._setingsFormElement);
    }

    _createSearchCountryInput() {
        const countrySearchContainer = createElement('div', { class: 'form-floating col px-0' });
        this._countrySearchElement = createElement(
            'input',
            {
                class: 'form-control',
                list: 'datalistOptions',
                id: 'countrySearch',
                placeholder: 'Type to search...',
                autocomplete: 'off',
                value: localStorage.getItem(WEATHER_COUNTRY_LABEL_LS),
            },
            { keyup: () => this._getAutocompleteCityList() }
        );
        countrySearchContainer.append(this._countrySearchElement);
        countrySearchContainer.append(
            createElement(
                'label',
                {
                    for: 'countrySearch',
                },
                null,
                'Location'
            )
        );

        this._createSettingsDatalistElement(countrySearchContainer);
        this._setingsFormElement.append(countrySearchContainer);
    }

    _createSettingsDatalistElement(parent) {
        this._datalistElement = createElement('datalist', { id: 'datalistOptions' });
        parent.append(this._datalistElement);
    }

    async _getAutocompleteCityList() {
        if (this._countrySearchElement.value !== '') {
            this._datalistOptions = new Map();
            Array.from(this._datalistElement.options).forEach((option) =>
                this._datalistOptions.set(option.value, option.getAttribute('data-value'))
            );
            this._datalistElement.innerHTML = '';
            try {
                const cityListData = await this._api.getCityList(this._countrySearchElement.value);
                cityListData.forEach((dataElement) => {
                    const cityElement = createElement('option', {
                        'data-value': dataElement.Key,
                        value: `${dataElement.LocalizedName}, ${dataElement.AdministrativeArea.LocalizedName}, ${dataElement.Country.LocalizedName}`,
                    });
                    this._datalistElement.append(cityElement);
                });
            } catch (error) {
                new Notification().showError('Fetch weather data error', error);
            }
        }
    }

    _createSearchCountrySaveAndCloseButton() {
        return createElement(
            'button',
            {
                type: 'button',
                class: 'btn btn-primary col-3',
                'data-bs-dismiss': 'modal',
            },
            {
                click: this._updateWeatherConfiguration(),
            },
            'Save & Close'
        );
    }

    _updateWeatherConfiguration() {
        return async () => {
            this._setLocalStorageValues(
                this._datalistOptions.get(this._countrySearchElement.value).toString(),
                this._countrySearchElement.value
            );
            await this._refreshOrCreateWeatherContent();
        };
    }

    _createWeatherContainer() {
        if (isDefined(document.getElementById('weatherContainer'))) {
            this._container.removeChild(document.getElementById('weatherContainer'));
        }
        this._weatherContainer = createElement('div', {
            id: 'weatherContainer',
            class: 'row mt-5',
        });
        this._container.append(this._weatherContainer);
        this._createToday();
        this._createNextDays();
    }
}
