var weatherLocation = null;
var weatherJSON = null;
var lastUpdatTimeStamp = null;
var dayLabels = new Array(5);
var dateLabels = new Array(5);


function DayForecast() { 
    this.dayTemp = "";
    this.daySymbol = "";
    this.dayName = "";
    this.dayDate = "";
};

function WeatherViewModel() {
    var self = this;
    self.currentSymbol = ko.observable("");
    self.location = ko.observable("");
    self.desc = ko.observable("");
    self.temp = ko.observable("");
    self.humidity = ko.observable("");
    self.forecasts = ko.observableArray();

    self.addForecast = function (dayForecast) {
        self.forecasts.push(dayForecast);
    };

    self.clearForecast = function () {
        self.forecasts([]);// null;//ko.observableArray();
    };
};

var viewModel = new WeatherViewModel();



$.mobile.loader.prototype.options.text = "loading............";
$.mobile.loader.prototype.options.textVisible = true;
$.mobile.loader.prototype.options.theme = "a";
$.mobile.loader.prototype.options.html = "";

//var refreshInterval = 30*1000*60; // 30 minutes;
var APP_SETTING_KEY_TEMPERATURE_UNIT = "com.visintelligence.weathertrend.temperatureunit";
//var APP_SETTING_KEY_WEATHER_JSON = "com.visintelligence.weathertrend.weatherjson";






$(document).bind("pageinit", function () {
    $("#divWeather").hide(); // probabl move under refresh

    $("#bRefresh").bind("click", function (event, ui) { 
		refreshData();
    });

    if (localStorage.getItem(APP_SETTING_KEY_TEMPERATURE_UNIT) == null) {
        localStorage.setItem(APP_SETTING_KEY_TEMPERATURE_UNIT, "F");
    }

    $( "#dialogSettings" ).bind({
        popupafteropen: function (event, ui) {
            $('input:radio[name="settingTempUnit"]').prop("checked",false).checkboxradio("refresh");
            $('input:radio[name="settingTempUnit"][value="' + localStorage.getItem(APP_SETTING_KEY_TEMPERATURE_UNIT) + '"]').click().checkboxradio("refresh");

            $("#bSaveSettings").bind({
                click: function (event, ui) {
                    selectedTempUnit = $('input:radio[name=settingTempUnit]:checked').val();
                    localStorage.setItem(APP_SETTING_KEY_TEMPERATURE_UNIT, selectedTempUnit);
                }
            });
        },
        popupafterclose: function (event, ui) {
            renderData();
            //refreshData();
        }

    });


    ko.applyBindings(viewModel, $("#divWeather")[0]);


    $.mobile.loading('show');

    refreshData();
});

function refreshData() {
	$.mobile.loading('show', { text: "Obtaining Location...", textonly: false });
    navigator.geolocation.getCurrentPosition(onSuccess, onError);
}

function onError(error) {
    renderError("Failed to obtain location." + "code: " + error.code + "\n" + "message: " + error.message + "\n");
}

function onSuccess(position) {
    weatherLocation = position.coords.latitude + "," + position.coords.longitude;
    downloadData();
}



/*==============================================================================================
	Should be called after weather location has been retrieved in the variable weatherLocation
==============================================================================================*/
function downloadData() {
    $.mobile.loading('show', { text: "Obtaining Location Address...", textonly: false });
    locationComp = weatherLocation.split(",");
    getGeoCodedLocation(parseFloat(locationComp[0]), parseFloat(locationComp[1]),"divLocation");

    $.mobile.loading('show', { text: "Obtaining Weather Data...", textonly: false });
    $.ajax({
        //url: "http://free.worldweatheronline.com/feed/weather.ashx?q=" + weatherLocation + "&format=json&num_of_days=5&key=ebd450a34b121632122111",
        url: "http://api.worldweatheronline.com/free/v1/weather.ashx?q=" + weatherLocation + "&format=json&num_of_days=5&key=6snp4vbdj7fw27yz7y3ucmsp",
        dataType: 'jsonp',
        success: processData
    }).fail(downloadDataFailed);
}

function downloadDataFailed() {
    renderError("Failed to download weather data.")
}

function processData(data) {

    $.mobile.loading('show', { text: "Processing Weather Data...", textonly: false });

    lastUpdatTimeStamp = new XDate().toISOString();

    for (var i = 0; i < dayLabels.length; i++) {
        currentTime = new XDate();
        currentTime.addDays(i);
        dayLabels[i] = currentTime.toString("ddd");
        dateLabels[i] = currentTime.toString("dd MMM");
    }

    $("#divTimeStamp").attr("title", lastUpdatTimeStamp);
    $("#divTimeStamp").prettyDate({ interval: 1000 });


    if (data.data.error) {
        html = data.data.error[0].msg;
        $("#divWeather").html(html);
        $("#divWeather").show();
        return;
    }

    weatherJSON = data;

    //setInterval(function () { refreshData() }, refreshInterval);
    renderData();
}


function renderData() {
    $.mobile.loading('show', { text: "Rendering Weather Data...", textonly: false });

    var data = weatherJSON;
    var tempData = new Array(5);
    var settingTempUnit = localStorage.getItem(APP_SETTING_KEY_TEMPERATURE_UNIT);

    viewModel.clearForecast();

    viewModel.currentSymbol(data.data.current_condition[0].weatherIconUrl[0].value);
    viewModel.desc(data.data.current_condition[0].weatherDesc[0].value);

    if (settingTempUnit == "C") {
        viewModel.temp(data.data.current_condition[0].temp_C + "&deg;C");
    } else {
        viewModel.temp(data.data.current_condition[0].temp_F + "&deg;F");
    }

    viewModel.humidity(data.data.current_condition[0].humidity + "%");

    i=0;
	$.each(data.data.weather, function (index, item) {
	    var df = new DayForecast();

	    if (settingTempUnit == "C") {
	        df.dayTemp = item.tempMaxC + "&deg; / " + item.tempMinC + "&deg";
	        tempData[index] = [parseInt(item.tempMaxC, 10), parseInt(item.tempMinC, 10)];
        } else {
	        df.dayTemp = item.tempMaxF + "&deg; / " + item.tempMinF + "&deg;";
	        tempData[index] = [parseInt(item.tempMaxF, 10), parseInt(item.tempMinF, 10)];
	    }

	    df.daySymbol = item.weatherIconUrl[0].value;
	    df.dayName = dayLabels[i];
	    df.dayDate = dateLabels[i];
	    viewModel.addForecast(df);

	    i++;
	});


	var cvs = $("#cvsTempGraph")[0];
    RGraph.Reset(cvs);
    RGraph.ObjectRegistry.Clear();
    RGraph.ObjectRegistry.Clear(cvs);
    RGraph.ObjectRegistry.Remove(cvs);
    
    var line1 = new RGraph.Line('cvsTempGraph', [tempData[0][0], tempData[1][0], tempData[2][0], tempData[3][0], tempData[4][0]], [tempData[0][1], tempData[1][1], tempData[2][1], tempData[3][1], tempData[4][1]]);
	line1.Set('chart.background.grid', true);
	line1.Set('chart.key', ["max","min"]);
	line1.Set('chart.key.position', 'gutter');
    line1.Set('chart.key.position.gutter.boxed', false);
	//line1.Set('chart.gutter.top', 45);
	line1.Set('chart.linewidth', 2);
	line1.Set('chart.gutter.left', 35);
	line1.Set('chart.hmargin', 5);
	//line1.Set('chart.hmargin', 15);
	//line1.Set('chart.title', 'Temperature trend');
	if (!document.all || RGraph.isIE9up()) {
		//line1.Set('chart.shadow', true);
	}
	line1.Set('chart.background.grid.border', false);
	line1.Set('chart.tickmarks', null);
	//line1.Set('chart.units.post', 'C');
	line1.Set('chart.colors', ['red', 'green']);
	//line1.Set('chart.curvy', 1);
	line1.Set('chart.labels',dayLabels);
	//line1.Set('chart.background.grid.hlines', true);
	line1.Set('chart.background.grid.autofit.numvlines', 11);
	line1.Set('chart.animation.unfold.initial', 0);
	line1.Draw();	
	
    $("#divWeather").show();
    
    $.mobile.loading('hide');
}


/*==============================================================================================
	Helper Methods: should be reusable in other apps
==============================================================================================*/

/*---------------------------------------------------------------------------------------------
	Renders Error with a retry link 
---------------------------------------------------------------------------------------------*/
function renderError(message) {
    alert(message);
    /*
    $("#divWeather").hide();
    $("#divError message").html(message);
    $("#divError").show();
    */
}


/*---------------------------------------------------------------------------------------------
	Retrieves the address of given (lat, long) and displays on the UI
---------------------------------------------------------------------------------------------*/

function getGeoCodedLocation(lat, long) {
    var geocoder = new google.maps.Geocoder();

    var latlng = new google.maps.LatLng(lat, long);

    geocoder.geocode({ 'latLng': latlng }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            if (results[0]) {
                viewModel.location(results[0].formatted_address);
                var arrAddress = results[0].address_components;
                // iterate through address_component array
                
                $.each(arrAddress, function (i, address_component) {
                    if (i == 2) {
                        viewModel.location(address_component.long_name);
                    }
                });
                
            } else {
                viewModel.location("No address found for the current location.");
            }
        } else {
            viewModel.location("Failed to obtain the address for the current location.");
        }
    });

}