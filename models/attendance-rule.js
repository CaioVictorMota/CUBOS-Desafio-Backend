import { v1 as uuidv1 } from 'uuid';
import dateTimeUtils from '../utils/dateTimeUtils.js';
import dtu from '../utils/dateTimeUtils.js'
import fu from '../utils/fileUtils.js'
    
const path = './saved-rules/'
const fileName = 'attendance-rules.json'

function saveNewAttendanceRule (requestBody) {
    const newAR = buildNewAttendanceRuleObject(requestBody)
    if (validateNonConflictingAttendanceRule(newAR)) {
        saveNewRuleToFile(newAR)
        return newAR
    }
    return undefined
}

function buildNewAttendanceRuleObject (requestBody) {
    const rule = {}
    rule.id = uuidv1()
    rule.day = requestBody.day
    rule.intervals = requestBody.intervals
    return rule
}

function saveNewRuleToFile (newAR) {
    let rules = getAllAttendanceRules()
    rules.push(newAR)
    fu.saveJSONFile(rules, path, fileName)
}

function getAllAttendanceRules () {
    let rules = fu.readJSONFile(path, fileName)
    if (!rules) {
        rules = []
    }
    return rules
}

function validateNonConflictingAttendanceRule(newAR) {
    return validateNonConflictingIntervals(newAR.intervals)
        && validateNonConflictingIntervalsWithSavedRules(newAR)
}

function validateNonConflictingIntervals (ints1) {
    for (const i1 of ints1) {
        for (const i2 of ints1) {
            if (ints1.indexOf(i1) === ints1.indexOf(i2)) {
                continue
            }
            if (dtu.areTimeIntervalsConflicting(i1, i2)) {
                return false
            }
        }
    }
    return true
}

function validateNonConflictingIntervalsArrays (ints1, ints2) {
    for (const i1 of ints1) {
        for (const i2 of ints2) {
            if (dtu.areTimeIntervalsConflicting(i1, i2)) {
                return false
            }
        }
    }
    return true
}

function validateNonConflictingIntervalsWithSavedRules (newAR) {
    const rules = getAllAttendanceRules()
    let intervals = []
    let weekday = undefined
    let date = undefined

    if (newAR.day === dtu.daily) {
        intervals = getIntervals(rules)
        return validateNonConflictingIntervalsArrays(newAR.intervals, intervals)
    } else if (dtu.getWeekdays().includes(newAR.day)) {
        weekday = newAR.day
    } else {
        weekday = dtu.getWeekdayByDateString(newAR.day)
        date = newAR.day
    }

    for (const rule of rules) {
        if (rule.day === dtu.daily) {
            intervals = intervals.concat(rule.intervals)
        } else if (rule.day === weekday || rule.day === date) {
            intervals = intervals.concat(rule.intervals)
        }
    }
    return validateNonConflictingIntervalsArrays(newAR.intervals, intervals)
}

function getIntervals (rules) {
    let intervals = []
    for (const rule of rules) {
        intervals = intervals.concat(rule.intervals)
    }
    return intervals
}

function getAttendanceRules (reqQuery) {
    if (dateQueryParamsExists(reqQuery)) {
        const startDt = dtu.dateStringToDate(reqQuery[dtu.startDateQueryParam])
        const endDt = dtu.dateStringToDate(reqQuery[dtu.endDateQueryParam])

        return filterAttendanceRulesByDateRange(startDt, endDt)
    } else {
        return getAllAttendanceRules()
    }
}

function dateQueryParamsExists (reqQuery) {
    return reqQuery[dtu.startDateQueryParam] && reqQuery[dtu.endDateQueryParam]
}

function filterAttendanceRulesByDateRange (startDate, endDate) {
    let date = dtu.duplicateDate(startDate)
    const allRules = getAllAttendanceRules()
    let rules = []
    while (date <= endDate) {
        let rule = buildNewFormattedRuleObject(date)

        rule.intervals = rule.intervals.concat(
            getDailyRulesIntervals(allRules))

        rule.intervals = rule.intervals.concat(
            getWeeklyRulesIntervals(date, allRules))

        rule.intervals = rule.intervals.concat(
            getDateRulesIntervals(date, allRules))

        if (rule.intervals.length !== 0) {
            rules.push(rule)
        }
        date = dtu.addDaysToDate(date, 1)
    }
    return rules
}

function buildNewFormattedRuleObject (date) {
    return {
        day: dtu.dateToString(date),
        intervals: []
    }
}

function getDailyRulesIntervals (rules=undefined) {
    if (!rules) {
        rules = getAllAttendanceRules()
    }
    return getRulesIntervalsByDayFilter(dtu.daily, rules)
}

function getWeeklyRulesIntervals (date, rules=undefined) {
    if (!rules) {
        rules = getAllAttendanceRules()
    }
    const day = dtu.getWeekdays()[date.getUTCDay()]
    return getRulesIntervalsByDayFilter(day, rules)
}

function getDateRulesIntervals (date, rules=undefined) {
    if (!rules) {
        rules = getAllAttendanceRules()
    }
    const day = dtu.dateToString(date)
    return getRulesIntervalsByDayFilter(day, rules)
}

function getRulesIntervalsByDayFilter (filter, rules=undefined) {
    if (!rules) {
        rules = getAllAttendanceRules()
    }
    let intervals = []
    for (const rule of rules) {
        if (rule.day === filter) {
            intervals = intervals.concat(rule.intervals)
        }
    }
    return intervals
}

function deleteAttendanceRule (id) {
    let rules = getAllAttendanceRules()
    for (const rule of rules) {
        if (rule.id === id) {
            const deletedRule = rules.splice(rules.indexOf(rule), 1)
            fu.saveJSONFile(rules, path, fileName)
            return deletedRule
        }
    }
    return undefined
}

const attendanceRule = {
    saveNewAttendanceRule,
    getAttendanceRules,
    deleteAttendanceRule
}

export default attendanceRule