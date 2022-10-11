first_half_person = ''
second_half_person = ''
today = false
roasterData = null

curr_date = new Date().getDate()

roasterTrack = null
module.exports = (robot) ->
      robot.respond /supportday/, (res) ->
            if roasterTrack
                  today = false
                  if roasterData
                        data = roasterData
                        notify(data, res)
                  else
                        robot.http(process.env.SUPPORT_SPREADSHEET_URL).get() (err, resp, body) ->
                              data = JSON.parse body
                              notify(data, res)
                  return
            roasterTrack = setInterval () ->
                  today = false
                  robot.http(process.env.SUPPORT_SPREADSHEET_URL).get() (err, resp, body) ->
                        data = JSON.parse body
                        notify(data, res)
            , 86400000

      robot.respond /stop_support_roaster/, (res) ->
            if roasterTrack
                  res.send "I'll be back!"
                  clearInterval(roasterTrack)
                  roasterTrack = null
                  roasterData = null
            else
                  res.send "Aww... Don't you feel lonely without me."

      checkRoaster = (row) ->
            today_day = parseInt(row["gsx$date"]["$t"])
            if today_day==curr_date
                  today = true
                  first_half_person = row["gsx$first"]["$t"]
                  second_half_person = row["gsx$second"]["$t"]

      notify = (response, res) ->
            if response["version"]
                  for row in response.feed.entry
                        checkRoaster(row)
                  if today is true
                        res.send "First half (10:00 AM - 3:00 PM) will be handled by @#{first_half_person}, Second half (3:00 PM - 8:00 PM) will be handled by @#{second_half_person}."
                  else
                        res.send "Support Team is covering for everyone today. Cheers to them!!"
            else
                  res.send "Duh!"
