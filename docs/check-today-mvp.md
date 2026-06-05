# Check Today MVP

## Purpose

Check Today is the first practical MVP for Germany Travel Checker.

It is designed for English-speaking travelers who are already in Germany and need a quick answer to questions such as:

- Is today a public holiday where I am?
- Are regular shops likely to be closed today?
- Can I buy water today?
- Can I buy groceries today?
- Can I buy cigarettes today?
- Are cafés, bakeries, restaurants, train stations or airports more likely fallback options?
- Which German federal state applies to the city I am visiting?

The MVP should provide practical guidance without pretending to know exact shop opening hours.

## Product principle

Check Today should be a rule-based helper first.

It should not use AI in the initial version.

It should not maintain a database of individual shops, kiosks, tobacco vending machines, cafés, bakeries, pharmacies or supermarkets.

It should combine stable data and stable rules:

- selected city
- mapped German federal state
- selected date
- weekday
- Sunday status
- statewide public holiday status
- school holiday status, if available
- general closure guidance
- practical fallback categories

## Initial target users

Primary users:

- travelers from the United States
- travelers from Canada
- travelers from Australia
- other English-speaking visitors to Germany
- travelers already in Germany who need practical information quickly

The product should be written in direct, simple English.

## Initial user flow

### Step 1: Choose a city

The first version should support a small list of common travel cities.

Initial city candidates:

- Berlin
- Munich
- Hamburg
- Cologne
- Frankfurt
- Stuttgart
- Dresden
- Nuremberg

Each city must map to a German federal state.

Example:

- Berlin → Berlin
- Munich → Bavaria
- Hamburg → Hamburg
- Cologne → North Rhine-Westphalia
- Frankfurt → Hesse
- Stuttgart → Baden-Württemberg
- Dresden → Saxony
- Nuremberg → Bavaria

### Step 2: Choose a date

The first version should support:

- Today
- Tomorrow
- Custom date

Today should be the default for the Check Today mode.

### Step 3: Show day status

The result should clearly state:

- city
- federal state
- date
- weekday
- whether the date is Sunday
- whether the date is a statewide public holiday
- whether the date falls during a school holiday period, if available

### Step 4: Show practical guidance

The result should explain what travelers should expect.

Possible status categories:

- Normal weekday
- Sunday closure warning
- Public holiday closure warning
- School holiday travel crowd warning
- Combined warning

## Guidance categories

### Water

For water, the app may suggest checking:

- major train stations
- airports
- gas stations
- kiosks
- cafés
- bakeries
- restaurants
- hotel reception
- vending machines where available

The app must not promise that any specific place is open.

### Groceries

For groceries, the app may suggest checking:

- major train stations
- airports
- gas stations
- selected kiosks
- small convenience-style shops where available

The app should explain that regular supermarkets are usually closed on Sundays and public holidays.

### Cigarettes

For cigarettes, the app may suggest checking:

- kiosks
- gas stations
- tobacco shops, if open
- vending machines where available and age verification works
- some train station shops

The app must not provide exact vending machine locations.

The app should remind users that tobacco availability may depend on age verification, local rules and exact opening hours.

### Cafés and bakeries

The app may explain that cafés, bakeries and restaurants may still be open in tourist areas, train stations, airports and city centers, but exact hours vary.

### Pharmacies

The app should be careful with pharmacies.

It may explain:

- regular pharmacies may be closed on Sundays and public holidays
- emergency pharmacies vary by date and location
- travelers should search for the official local emergency pharmacy service or check Google Maps

The app should not guess which pharmacy is on emergency duty.

## Result examples

### Normal weekday

Title:

Today in Berlin looks normal.

Message:

Today is a regular weekday in Berlin. Regular shops, supermarkets, cafés and services are generally more likely to be open, but exact hours still vary by business. Check Google Maps or the official business website before relying on a specific place.

### Sunday

Title:

Today is Sunday in Munich.

Message:

Most regular supermarkets and many shops are usually closed on Sundays in Germany. For essentials such as water or snacks, travelers often check major train stations, airports, gas stations, kiosks, cafés, bakeries, restaurants or hotel reception. Exact opening hours vary, so check Google Maps before going.

### Public holiday

Title:

Today is a public holiday in Bavaria.

Message:

Regular shops and supermarkets are usually closed on public holidays. Restaurants, cafés, bakeries, tourist attractions, train stations, airports and gas stations may follow different rules. Check exact opening hours before relying on a specific place.

### School holiday warning

Title:

Your date falls during school holidays in Bavaria.

Message:

School holidays do not usually close shops, but they can affect travel demand. Trains, hotels, attractions and roads may be busier, especially around weekends or popular vacation periods.

## Risk levels

The first version can use simple risk labels.

### Low

Normal weekday with no public holiday or Sunday warning.

### Medium

Sunday, school holiday period or mild travel warning.

### High

Public holiday or combined warning such as public holiday plus school holiday period.

The risk label should be explanatory, not alarming.

## Out of scope for MVP

The first Check Today MVP should not include:

- AI answers
- exact shop opening hours
- individual shop database
- vending machine locations
- tobacco shop database
- real-time crowd data
- hotel or train price predictions
- restaurant recommendations
- route planning
- user accounts
- paid features
- push notifications
- native mobile app

## Future extensions

Possible later additions:

- Check trip dates
- multi-city trip checker
- city survival guides
- English domain routing for germanytravelchecker.com
- PWA support
- affiliate links
- ads
- saved trips
- offline survival guide
- AI explanation layer

## Data safety rules

Official holiday and school holiday data should come from the existing Schulferienklar data pipeline.

The app should not let AI guess official dates.

Exact business opening hours should not be stored as fixed data.

The app should always include a reminder that exact opening hours must be checked on Google Maps or official business pages.

## First implementation suggestion

The first implementation should be small:

- add a city-to-state mapping file or constant
- add a date helper for today, tomorrow and custom dates
- reuse existing public holiday data by state and year
- reuse existing school holiday data where available
- render a simple Check Today section on the Germany Travel Checker page
- keep the result text template-based
