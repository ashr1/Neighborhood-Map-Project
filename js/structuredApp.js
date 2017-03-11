/* structureApp.js has all of the direct app related js.  At a bird's eye view, it has the model, view model, 2 functions handling the google
    map request (found in the index html file) and a function toggling the nav bar class

    by: Ashwin Ramachandran
*/
// map is a variable that will be the the google map object (as long as the callback is called via successful request)
// viewmodelInst is the specific instance of the viewmodel that gets initialized...it is used in the initmap function (the callback)
var map, viewModelInst;
// Array containing location data, just pre data without concept of the app
var Model = [{
        title: "24 Hour Fitness",
        location: {
            lat: 37.3711086,
            lng: -121.9111053
        }
    },
    {
        title: "Gold's Gym",
        location: {
            lat: 37.379918,
            lng: -121.959164
        }
    },
    {
        title: "Bikram Yoga Santa Clara",
        location: {
            lat: 37.3844438,
            lng: -121.9560421
        }
    },
    {
        title: "Bay Club",
        location: {
            lat: 37.37683579999999,
            lng: -121.9860288
        }
    },
    {
        title: "Airborne Gymnastics",
        location: {
            lat: 37.370437,
            lng: -121.9564803
        }
    },
    {
        title: "Academy of Self Defense",
        location: {
            lat: 37.384642,
            lng: -121.945463
        }
    },
    {
        title: "Just Breathe Yoga",
        location: {
            lat: 37.39541479999999,
            lng: -121.9463656
        }
    },
    {
        title: "Snap Fitness",
        location: {
            lat: 37.3251937,
            lng: -121.950962
        }
    }
];

var ViewModel = function() {

    var self = this;

    self.markers = ko.observableArray(); // array of markers, each marker is a location

    self.queryValue = ko.observable(""); //the string that the user types in the filter input field

    // user clicking on location makes that location/marker the current one
    // current marker must be in the active locations list (user has not filtered it out yet)...I thought it made more sense to do it this way
    self.currentMarker = null;

    // one info window in this app...content is just blank initially
    self.infoBox = new google.maps.InfoWindow({
        content: ''
    });

    //onDemandLocations is the computed observable (array) which is all the active markers (markers/locations meeting the user's query)
    self.onDemandLocations = ko.computed(function() {
        return ko.utils.arrayFilter(self.markers(), function(marker) {
            // check if the location name (via the marker) contains the string the user searched for
            var containsOrNot = (marker.getTitle()).toLowerCase().indexOf(self.queryValue().toLowerCase());
            // scenario that the current location does not match the user's requirements
            if (containsOrNot == -1) {
                // current marker is no longer acive since it doesn't meet the user's requirements anymore
                if (marker == self.currentMarker) {
                    marker.setAnimation(google.maps.Animation.DROP);
                    self.currentMarker = null;
                    self.infoBox.close(); //close the info window since the marker is no longer active
                }
                marker.setVisible(false); // a marker shouldn't be seen if it gets filtered
                return false;
            } else {
                marker.setVisible(true); //markers that meet the requirement should be visible on the map
                return true;
            }

        });
    }, self);

    // add marker is the function that adds all the default locations to the map as a marker
    // basically this function is the same as what was shown in udacity google maps apis course starter code (first couple of exercises)
    self.addMarkers = function() {
        // bounds object will ensure that the map starts off with all the markers (after adding them) visible
        var bounds = new google.maps.LatLngBounds();

        // this for loop basically creates a map marker for each of the default locations in the model array
        for (var i = 0; i < Model.length; i++) {
            var position = Model[i].location;
            var title = Model[i].title;

            var marker = new google.maps.Marker({
                map: map,
                position: position,
                title: title,
                animation: google.maps.Animation.DROP,
                id: i
            });

            self.markers.push(marker);
            // clicking on marker should make an infowindow pop up at that marker via the "openInfoBox" method
            marker.addListener('click', function() {
                self.openInfoBox(this);
            });
            bounds.extend(position);
        }

        map.fitBounds(bounds);
    }

    // this function opens the info window on the marker that was clicked on by the user
    self.openInfoBox = function(clickedLocation) {

        /* first, in case of clicking on a different marker while a currentmarker previously existed,
            ensure the "old current marker" stops bouncing*/
        if (self.currentMarker && (self.currentMarker != clickedLocation)) {
            self.currentMarker.setAnimation(null);
        }
        // current marker is now whatever the user clicked on most recently
        self.currentMarker = clickedLocation;
        // popuateInfoBox fills the info window with information pertaining to the location via 3rd party api call
        self.populateInfoBox();
        self.infoBox.open(map, self.currentMarker);
        // making the current marker bounce since it is the chosen one
        self.currentMarker.setAnimation(google.maps.Animation.BOUNCE);


    }

    // popuateInfoBox fills the info window with information pertaining to the location via 3rd party api call
    self.populateInfoBox = function() {
        var foursqrUrl = 'https://api.foursquare.com/v2/venues/search?';

        $.ajax({
            // jquery's page on .ajax says requests by default are async requests ("ajax" anyways), so no need to specify it directly here
            url: foursqrUrl,
            data: {
                ll: "37.3541079,-121.9552356",
                query: self.currentMarker.getTitle(),
                limit: 3,
                client_id: 'GZSDRG4YISSETPUX0LER4DOG5B1T4ELKJIP2NVNQJH4HMSAP',
                client_secret: 'IWZY0TJGAIKXKMGXZSPVFTNEZRV5RSIYBMI0EIH3J0K2GIWK',
                v: '20170307'
            },
            success: function(responseData) {
                // closestLoc is the closest location of all the locations that foursquare returns (that matches our location query)
                // minDist is the distance (from the general santa clara latlong) that we use to ascertain the closestLoc 
                var closestLoc, minDist, locAry, contentStr;

                // this variable accumulates the html content to display in the info window
                contentStr = '';

                // locAry is the array of all matched locations returned by foursquare...closestLoc, the location closest to the general lat long, will be in here
                locAry = responseData.response.venues;

                // scenario that there is at least 1 matched location returned by foursquare
                if (locAry.length > 0) {
                    // grab the first location and find out its distance away
                    closestLoc = locAry[0];
                    minDist = closestLoc.location.distance;

                    //loop through all the locations to find the location closest
                    for (var index = 1; index < locAry.length; index++) {
                        if ((locAry[index]).location.distance < minDist) {
                            closestLoc = locAry[index];
                            minDist = (locAry[index]).location.distance;
                        }
                    }

                    // html string for the name of the closest location
                    contentStr += '<div>' + closestLoc.name + '</div><hr>';

                    // html element(s) for the formatted address for the closest location
                    for (var i = 0; i < closestLoc.location.formattedAddress.length; i++) {
                        contentStr += '<div>' + (closestLoc.location.formattedAddress)[i] + '</div>';
                    }

                    // not all responses for a location have the phone number, but if it does, make a html string to show the phone number
                    if (closestLoc.contact.hasOwnProperty('formattedPhone')) {
                        contentStr += '<br><div>' + closestLoc.contact.formattedPhone + '</div>';
                    }

                    // html string to credit foursquare api
                    contentStr += '<br><div>Data Provided By FourSquare</div>';

                    // make info window display the html string we made thus far 
                    self.infoBox.setContent(contentStr);
                }

                // the scenario where request was successful but no locations were matched
                else {
                    self.infoBox.setContent('Sorry, no gym info found in this location.');
                }

            },

            // if the request itself failed, let the user know through a message in the info window
            error: function() {
                self.infoBox.setContent('<div>The request to FourSquare failed. <hr>Either reclick the same marker or click on a different marker to try again.</div>');
            }
        });
    }

};

// initmap is the callback used for the google map request (see index html)
var initMap = function() {
    // set up the google map object with the location for santa clara
    map = new google.maps.Map(document.getElementById('map-container'), {
        center: {
            lat: 37.3541079,
            lng: -121.9552356
        },
        zoom: 13
    });
    // instantiate the viewmodel
    viewModelInst = new ViewModel();

    ko.applyBindings(viewModelInst);
    //this would be the actual kick off point where the markers are added on the map 
    viewModelInst.addMarkers();
};

// request for google map failed so alert the user of this (see index html)
var googleFailed = function() {
    window.alert("Request to google failed.  Map could not be loaded.")
};

// toggle the class for the nav side bar...this function is here, not dealt with ko, because it isn't directly data related
var openSidebar = function() {
    $(".list-panel").toggleClass("open-list-panel");
};