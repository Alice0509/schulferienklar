import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { localizeTree, translateText } from "../src/home-i18n.js";

test("German UI remains unchanged by default", () => {
  assert.equal(translateText("Bundesland auswählen", "de"), "Bundesland auswählen");
  assert.equal(translateText("Schulferien auf einen Blick.", "de"), "Schulferien auf einen Blick.");
});

test("English home translates important calendar and planner labels", () => {
  assert.equal(translateText("Schulferien auf einen Blick.", "en"), "School holidays at a glance.");
  assert.equal(translateText("Bundesland auswählen", "en"), "Select a federal state");
  assert.equal(translateText("Nächste Ferien", "en"), "Next school break");
  assert.equal(translateText("Urlaubsplaner & Brückentage", "en"), "Leave planner & bridge days");
  assert.equal(translateText("Vergleich öffnen", "en"), "Open comparison");
  assert.equal(translateText("Bayern", "en"), "Bavaria");
});

test("Translate React elements without losing links, interaction props or classes", () => {
  const handleClick = () => {};
  const element = createElement("button", {
    type: "button", className: "calendar-action", "aria-label": "Kalender",
    onClick: handleClick,
  }, "Kalender");
  const translated = localizeTree(element, "en");
  assert.equal(translated.props.children[0], "Calendar");
  assert.equal(translated.props["aria-label"], "Calendar");
  assert.equal(translated.props.onClick, handleClick);
  assert.equal(translated.props.className, "calendar-action");
});

test("Dates and state/year numbers are not changed by text localization", () => {
  assert.equal(translateText("2028", "en"), "2028");
  assert.equal(translateText("31.07.2028", "en"), "31.07.2028");
  assert.equal(translateText("Kalender 2028", "en"), "Calendar 2028");
});
