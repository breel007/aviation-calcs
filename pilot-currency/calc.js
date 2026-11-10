/**
 * FAA pilot currency checker.
 *
 * Citations (14 CFR, as commonly applied for calendar-month end dates):
 *
 *   61.57(a)  Day passenger currency — 3 takeoffs and 3 landings within
 *             the preceding 90 days, in the same category, class, and
 *             type (if a type rating is required). Tailwheel landings
 *             must be to a full stop. 61.57(a)(1)(ii).
 *
 *   61.57(b)  Night passenger currency — 3 takeoffs and 3 full-stop
 *             landings in the period beginning 1 hour after sunset and
 *             ending 1 hour before sunrise, within the preceding 90 days.
 *
 *   61.57(c)  Instrument experience — 6 instrument approaches, holding
 *             procedures, and intercepting and tracking courses, performed
 *             within the 6 calendar months preceding the month of the
 *             flight.
 *
 *   61.57(d)  If instrument experience lapses, a 6-calendar-month grace
 *             period follows during which the 61.57(c) tasks may be
 *             completed to regain currency (you may not act as PIC under
 *             IFR until current). After that grace period an instrument
 *             proficiency check is required.
 *
 *   61.56(c)  Flight review — 24 calendar months. A practical test for a
 *             new certificate or rating also satisfies 61.56(d).
 *
 *   61.23(d)  Duration of a medical certificate, measured to the last day
 *             of the relevant month, based on the class of privileges and
 *             whether the person had reached their 40th birthday on the
 *             date of the examination:
 *
 *               1st-class privileges:  12 mo (under 40) / 6 mo (40+)
 *               2nd-class privileges:  12 mo
 *               3rd-class privileges:  60 mo (under 40) / 24 mo (40+)
 *
 * This is a planning aid, not legal advice. Always read the current
 * regulation; parts, ratings, and special programs (BasicMed, sport
 * pilot, SIC, examiner authorizations) can change the picture.
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  /** Parse YYYY-MM-DD as a UTC calendar date (noon UTC to avoid DST edges). */
  function parseISODate(s) {
    if (!s || typeof s !== "string") return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
    if (!m) return null;
    var y = Number(m[1]);
    var mo = Number(m[2]);
    var d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    var dt = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return dt;
  }

  function ymd(dt) {
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    return dt.getUTCFullYear() + "-" + pad(dt.getUTCMonth() + 1) + "-" + pad(dt.getUTCDate());
  }

  function formatLong(dt) {
    var months = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    return months[dt.getUTCMonth()] + " " + dt.getUTCDate() + ", " + dt.getUTCFullYear();
  }

  function addDays(dt, days) {
    var out = new Date(dt.getTime());
    out.setUTCDate(out.getUTCDate() + days);
    return out;
  }

  /**
   * Last instant of the calendar month that is `months` months after the
   * month of `dt`. Exam on 10 March 2025 + 12 calendar months → 31 March 2026.
   */
  function endOfCalendarMonths(dt, months) {
    // Last day of (month index + months)
    return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + months + 1, 0, 12, 0, 0));
  }

  /** Whole years of age on `onDate`. Birthday on the exam date counts as having reached that age. */
  function ageOn(dob, onDate) {
    var age = onDate.getUTCFullYear() - dob.getUTCFullYear();
    var md = onDate.getUTCMonth() - dob.getUTCMonth();
    if (md < 0 || (md === 0 && onDate.getUTCDate() < dob.getUTCDate())) age--;
    return age;
  }

  function cmpDate(a, b) {
    // Compare calendar dates only
    var ka = a.getUTCFullYear() * 10000 + (a.getUTCMonth() + 1) * 100 + a.getUTCDate();
    var kb = b.getUTCFullYear() * 10000 + (b.getUTCMonth() + 1) * 100 + b.getUTCDate();
    return ka === kb ? 0 : ka < kb ? -1 : 1;
  }

  function statusVs(asOf, expiresOn) {
    if (!expiresOn) return "unknown";
    if (cmpDate(asOf, expiresOn) <= 0) return "current";
    return "expired";
  }

  /**
   * 90-day landing currency: current on the calendar day that is 90 days
   * after the qualifying landing, and expired the day after that.
   * Example: landing on 12 August → current through 10 November
   * (12 Aug + 90 days = 10 Nov).
   */
  function landingCurrency(qualifyingDate, asOf) {
    if (!qualifyingDate) {
      return { status: "unknown", expiresOn: null, daysRemaining: null, note: "No qualifying date entered." };
    }
    var expiresOn = addDays(qualifyingDate, 90);
    var status = statusVs(asOf, expiresOn);
    var daysRemaining = Math.round((expiresOn.getTime() - asOf.getTime()) / 86400000);
    return {
      status: status,
      qualifyingDate: qualifyingDate,
      expiresOn: expiresOn,
      daysRemaining: daysRemaining,
      citation: "14 CFR 61.57"
    };
  }

  /**
   * Calendar-month currency: activity in month M is good through the last
   * day of month M+months.
   * Instrument 61.57(c): 6 calendar months preceding the month of the flight
   * → last activity in January is good through 31 July (6 months).
   */
  function calendarMonthCurrency(activityDate, months, asOf) {
    if (!activityDate) {
      return { status: "unknown", expiresOn: null, daysRemaining: null, note: "No date entered." };
    }
    var expiresOn = endOfCalendarMonths(activityDate, months);
    var status = statusVs(asOf, expiresOn);
    var daysRemaining = Math.round((expiresOn.getTime() - asOf.getTime()) / 86400000);
    return {
      status: status,
      activityDate: activityDate,
      expiresOn: expiresOn,
      daysRemaining: daysRemaining
    };
  }

  /**
   * Medical durations from 61.23(d).
   * Returns privileges with their expiry dates.
   */
  function medicalDurations(cls, examDate, ageAtExam) {
    var under40 = ageAtExam < 40;
    var firstClassMonths = under40 ? 12 : 6;
    var secondClassMonths = 12;
    var thirdClassMonths = under40 ? 60 : 24;
    var out = {
      class: cls,
      examDate: examDate,
      ageAtExam: ageAtExam,
      under40: under40,
      firstClassExpires: null,
      secondClassExpires: null,
      thirdClassExpires: endOfCalendarMonths(examDate, thirdClassMonths),
      firstClassMonths: firstClassMonths,
      secondClassMonths: secondClassMonths,
      thirdClassMonths: thirdClassMonths
    };
    if (cls === "first") {
      out.firstClassExpires = endOfCalendarMonths(examDate, firstClassMonths);
      out.secondClassExpires = endOfCalendarMonths(examDate, secondClassMonths);
    } else if (cls === "second") {
      out.secondClassExpires = endOfCalendarMonths(examDate, secondClassMonths);
    }
    return out;
  }

  function medicalStatus(durations, asOf, desiredPrivileges) {
    desiredPrivileges = desiredPrivileges || "third";
    var expires;
    if (desiredPrivileges === "first") expires = durations.firstClassExpires;
    else if (desiredPrivileges === "second") expires = durations.secondClassExpires;
    else expires = durations.thirdClassExpires;
    if (!expires) {
      return {
        status: "not-applicable",
        expiresOn: null,
        desiredPrivileges: desiredPrivileges,
        note: "This certificate class does not confer " + desiredPrivileges + "-class privileges."
      };
    }
    var status = statusVs(asOf, expires);
    // If first-class has lapsed but second or third remains, say so
    var note = null;
    if (desiredPrivileges === "first" && status === "expired" && durations.secondClassExpires && cmpDate(asOf, durations.secondClassExpires) <= 0) {
      note = "First-class privileges have lapsed, but this certificate is still valid for second-class (and third-class) privileges.";
    } else if ((desiredPrivileges === "first" || desiredPrivileges === "second") && status === "expired" && durations.thirdClassExpires && cmpDate(asOf, durations.thirdClassExpires) <= 0) {
      note = (desiredPrivileges === "first" ? "First-class" : "Second-class") + " privileges have lapsed, but this certificate is still valid for third-class privileges.";
    }
    return {
      status: status,
      expiresOn: expires,
      daysRemaining: Math.round((expires.getTime() - asOf.getTime()) / 86400000),
      desiredPrivileges: desiredPrivileges,
      note: note
    };
  }

  /**
   * BasicMed (part 68 / 61.23(c)(3)) — optional companion check, not a
   * 61.23 medical-certificate duration:
   *   comprehensive medical examination (CME) every 48 calendar months
   *   medical education course every 24 calendar months
   */
  function basicMed(cmeDate, courseDate, asOf) {
    var cme = cmeDate ? calendarMonthCurrency(cmeDate, 48, asOf) : { status: "unknown", expiresOn: null };
    var course = courseDate ? calendarMonthCurrency(courseDate, 24, asOf) : { status: "unknown", expiresOn: null };
    var status = "unknown";
    if (cme.status === "expired" || course.status === "expired") status = "expired";
    else if (cme.status === "current" && course.status === "current") status = "current";
    return {
      status: status,
      cme: cme,
      course: course,
      citation: "14 CFR 61.23(c)(3) and Part 68"
    };
  }

  function compute(input) {
    input = input || {};
    var asOf = parseISODate(input.asOf);
    if (!asOf) return { error: "Enter an “as of” date." };

    var dayLanding = input.dayLandingDate ? parseISODate(input.dayLandingDate) : null;
    var nightLanding = input.nightLandingDate ? parseISODate(input.nightLandingDate) : null;
    var instrument = input.instrumentDate ? parseISODate(input.instrumentDate) : null;
    var review = input.flightReviewDate ? parseISODate(input.flightReviewDate) : null;
    var exam = input.examDate ? parseISODate(input.examDate) : null;
    var dob = input.dateOfBirth ? parseISODate(input.dateOfBirth) : null;

    if (input.dayLandingDate && !dayLanding) return { error: "The day-landing date is not a valid calendar date." };
    if (input.nightLandingDate && !nightLanding) return { error: "The night-landing date is not a valid calendar date." };
    if (input.instrumentDate && !instrument) return { error: "The instrument-experience date is not a valid calendar date." };
    if (input.flightReviewDate && !review) return { error: "The flight-review date is not a valid calendar date." };
    if (input.examDate && !exam) return { error: "The medical-exam date is not a valid calendar date." };
    if (input.dateOfBirth && !dob) return { error: "The date of birth is not a valid calendar date." };

    var out = {
      asOf: asOf,
      asOfText: ymd(asOf),
      error: null,
      dayPassenger: landingCurrency(dayLanding, asOf),
      nightPassenger: landingCurrency(nightLanding, asOf),
      instrument: null,
      flightReview: review ? Object.assign(calendarMonthCurrency(review, 24, asOf), { citation: "14 CFR 61.56(c)" }) : { status: "unknown", expiresOn: null, citation: "14 CFR 61.56(c)", note: "No flight-review date entered." },
      medical: null,
      basicMed: null
    };

    out.dayPassenger.citation = "14 CFR 61.57(a)";
    out.nightPassenger.citation = "14 CFR 61.57(b)";

    if (instrument) {
      var currentThrough = calendarMonthCurrency(instrument, 6, asOf);
      var graceThrough = calendarMonthCurrency(instrument, 12, asOf);
      var ifrStatus;
      var ifrNote = null;
      if (currentThrough.status === "current") {
        ifrStatus = "current";
      } else if (graceThrough.status === "current") {
        ifrStatus = "grace";
        ifrNote = "Instrument currency has lapsed. You are in the 6-calendar-month grace period under 61.57(d): you may complete the 61.57(c) tasks to regain currency, but you may not act as PIC under IFR or in IMC until those tasks are done. After " + formatLong(graceThrough.expiresOn) + " an instrument proficiency check is required.";
      } else {
        ifrStatus = "ipc-required";
        ifrNote = "More than 6 calendar months have passed since instrument currency lapsed. An instrument proficiency check (61.57(d)) is required before acting as PIC under IFR or in IMC.";
      }
      out.instrument = {
        status: ifrStatus,
        lastExperience: instrument,
        currentThrough: currentThrough.expiresOn,
        graceThrough: graceThrough.expiresOn,
        daysRemaining: ifrStatus === "current" ? currentThrough.daysRemaining : (ifrStatus === "grace" ? graceThrough.daysRemaining : graceThrough.daysRemaining),
        note: ifrNote,
        citation: "14 CFR 61.57(c) and 61.57(d)"
      };
    } else {
      out.instrument = { status: "unknown", citation: "14 CFR 61.57(c) and 61.57(d)", note: "No instrument-experience date entered." };
    }

    if (exam) {
      var age = isFiniteNumber(input.ageAtExam) ? input.ageAtExam : (dob ? ageOn(dob, exam) : null);
      if (age == null) {
        out.medical = { status: "unknown", note: "Enter date of birth or age at the exam to apply 61.23(d)." };
      } else {
        var cls = input.medicalClass || "third";
        var desired = input.desiredPrivileges || (cls === "first" ? "first" : cls === "second" ? "second" : "third");
        var dur = medicalDurations(cls, exam, age);
        var st = medicalStatus(dur, asOf, desired);
        out.medical = Object.assign({
          citation: "14 CFR 61.23(d)",
          durations: dur,
          ageAtExam: age
        }, st);
      }
    } else {
      out.medical = { status: "unknown", citation: "14 CFR 61.23(d)", note: "No medical-exam date entered." };
    }

    if (input.basicMedCmeDate || input.basicMedCourseDate) {
      var cme = input.basicMedCmeDate ? parseISODate(input.basicMedCmeDate) : null;
      var course = input.basicMedCourseDate ? parseISODate(input.basicMedCourseDate) : null;
      if (input.basicMedCmeDate && !cme) return { error: "The BasicMed examination date is not a valid calendar date." };
      if (input.basicMedCourseDate && !course) return { error: "The BasicMed course date is not a valid calendar date." };
      out.basicMed = basicMed(cme, course, asOf);
    }

    return out;
  }

  var api = {
    parseISODate: parseISODate,
    ymd: ymd,
    formatLong: formatLong,
    addDays: addDays,
    endOfCalendarMonths: endOfCalendarMonths,
    ageOn: ageOn,
    cmpDate: cmpDate,
    landingCurrency: landingCurrency,
    calendarMonthCurrency: calendarMonthCurrency,
    medicalDurations: medicalDurations,
    medicalStatus: medicalStatus,
    basicMed: basicMed,
    compute: compute
  };

  root.PilotCurrency = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
