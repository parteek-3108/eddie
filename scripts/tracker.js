// Supported Apps
const INCOMING_WEBHOOK = "incoming-webhook";
const ALERT_MANAGER = "alert-manager";

// Time Constants
const ONE_WEEK = "7 * 24 * 60 * 60 * 1000";
const FIVE_MINUTES = "5 * 60 * 1000";

// Default Messages
const NO_DATA_MESSAGE = "No data so far. Please reset the alert count data or wait for any alert to trigger.";
const WRONG_INPUT_OR_UNKNOWN_ERROR = "Wrong Input OR Unknown Error Occured";
const NO_ALERT = "No Alerts were there";
const CONTACT_AUTHORS = "contact <!U0205LMHPS8> or <!U0405LVWOL7>";

setExpiry = (robot, channel, time) => {
    robot.brain.data[channel].expiry = time;
};

/**
 * if the previous record has the expiry time 
 * less than current time, then:
 *   Removes the previous data
 *   Copies current data to previous data
 *   Sets current data as new object
 */
removeExpiredData = (robot, msg) => {
    const channel = getChannel(msg);

    const data = robot.brain.data[channel];
    if(data === undefined) {
        return;
    }

    const expiry = data.expiry;
    if(typeof expiry === "number" && expiry < (new Date).getTime()) {
        deleteData(robot, channel);
        robot.brain.data[channel].prev = {...robot.brain.data[channel].current};

        let updatedExpiry = expiry;
        let now = (new Date).getTime();
        let iterations = 0;
        while(updatedExpiry < now) {
            // Uncomment for testing
            updatedExpiry += eval(FIVE_MINUTES);
            // updatedExpiry += eval(ONE_WEEK);
            iterations++;
        }

        if(iterations > 1) {
            deleteData(robot, channel);
            robot.brain.data[channel].prev = {};
        }

        setExpiry(robot, channel, updatedExpiry);
        deleteData(robot, channel, "current");
        robot.brain.data[channel].current = {};
    }
};

getChannel = (msg) => {
    return msg.envelope.user.room;
};

deleteData = (robot, channel, period = "prev") => {
    delete robot.brain.data[channel][period];
};

getAlertName = (appName, msg) => {
    let start = 0, end = 0;

    // Uncomment for testing
    appName = ALERT_MANAGER;

    switch(appName) {
        case INCOMING_WEBHOOK:
            start = msg.search(/alerting/i) + 8;
            break;
        case ALERT_MANAGER:
            start = msg.search(/firing/i) + 6;
            break;
        default:
            return "";
    }

    try {
        while(start < msg.length && msg[start] !== "[") {
            start++;
        }
    
        end = start;
        while(end < msg.length && msg[end] !== "\n") {
            end++;
        }
    }
    catch(e) {
        return "";
    }

    return msg.substring(start, end - 1).replace(/\(https:\/\/.*\)[\*]{0,}/, "");
};

increment = (robot, alertName, msg) => {
    if(alertName === undefined || alertName === null || alertName === "") {
        return;
    }

    const channel = getChannel(msg);

    if(robot.brain.data[channel] === undefined) {
        robot.brain.data[channel] = {};
    }

    if(robot.brain.data[channel].prev === undefined) {
        robot.brain.data[channel].prev = {};
        // Uncomment for testing
        setExpiry(robot, channel, (new Date).getTime() + eval(FIVE_MINUTES));
        // setExpiry(robot, channel, (new Date).getTime() +  eval(ONE_WEEK));
    }

    if(robot.brain.data[channel].current === undefined) {
        robot.brain.data[channel].current = {};
    }
    
    let count = robot.brain.data[channel].current[alertName] === undefined ? 0 : robot.brain.data[channel].current[alertName];
    robot.brain.data[channel].current[alertName] = count + 1;
};

processIncrement = (robot, msg) => {
    const appName = msg.message.user.name.toLowerCase();
    const alertName = getAlertName(appName, msg.message.text);
    increment(robot, alertName, msg);
};

getDateInIST = (timestamp) => {
    var dateIST = new Date(timestamp);
    dateIST.setHours(dateIST.getHours() + 5);
    dateIST.setMinutes(dateIST.getMinutes() + 30);
    return dateIST.toUTCString().replace("GMT", "IST");
};

formatData = (data, period, time) => {
    if(data === undefined) {
        return NO_DATA_MESSAGE;
    }

    // Uncomment for testing
    let from = getDateInIST(time - (period === "prev" ? 2 : 1) * eval(FIVE_MINUTES));
    let to = getDateInIST(time - (period === "prev" ? 1 : 0) * eval(FIVE_MINUTES));

    // let from = getDateInIST(time - (period === "prev" ? 2 : 1) * eval(ONE_WEEK));
    // let to = getDateInIST(time - (period === "prev" ? 1 : 0) * eval(ONE_WEEK));

    let message = "";

    switch(period) {
        case "prev":
            message = "*Previous On-call* ( `" + from + "` - `" + to + "` )\n";
            break;
        case "current":
            message = "*Current On-call* ( `" + from + "` - `" + to + "` )\n";
    }

    if(Object.keys(data).length === 0) {
        message += "\t" + NO_ALERT + "\n";
        return message;
    }

    for(x in data) {
        message += "\t• *" + x + "*: `" + data[x] + "`\n";
    }

    return message;
};

checkDataAndReply = (msg, data, period) => {
    if(data === undefined) {
        msg.send(NO_DATA_MESSAGE);
        return;
    }

    var message = WRONG_INPUT_OR_UNKNOWN_ERROR;
    if(period === "all") {
        checkDataAndReply(msg, data, "prev");
        checkDataAndReply(msg, data, "current");
        return;
    }
    
    message = formatData(data[period], period, data.expiry);

    msg.send(message);
};

module.exports = (robot) => {
    robot.hear(/.*(alerting|firing).*/i, (msg) => {
        removeExpiredData(robot, msg);
        processIncrement(robot, msg);
    });

    robot.respond(/reset alert count data/i, (msg) => {
        let channel = getChannel(msg);
        
        if(robot.brain.data[channel] === undefined) {
            robot.brain.data[channel] = {};
        }

        if(robot.brain.data[channel].prev !== undefined) {
            deleteData(robot, channel);
        }
        robot.brain.data[channel].prev = {};
        // Uncomment for testing
        setExpiry(robot, channel, (new Date).getTime() + eval(FIVE_MINUTES));
        // setExpiry(robot, channel, (new Date).getTime() + eval(ONE_WEEK));
    
        if(robot.brain.data[channel].current !== undefined) {
            deleteData(robot, channel, "current");
        }
        robot.brain.data[channel].current = {};

        msg.send("Reset Successful!!\nHere is your new data\n");
        checkDataAndReply(msg, robot.brain.data[channel], "all");
    });

    robot.respond(/get (prev|current|all) alert count/i, (msg) => {
        removeExpiredData(robot, msg);

        let channel = getChannel(msg);
        let data = robot.brain.data[channel];
        let period = msg.match[1];
        checkDataAndReply(msg, data, period);
    });
};
