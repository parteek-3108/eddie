module.exports = (robot) ->

  robot.hear /shut up/i, (msg) ->
    from = msg.message.user.name.toLowerCase()
    if from is "akshay"
      msg.send "Tu chup kr, Akshay"

  robot.hear /Aaryan/i, (msg) ->
    from = msg.message.user.name.toLowerCase()
    if from is "Ashish"
      msg.send "His name is Aryan, Ashish."

  robot.hear /review PR/i, (msg) ->
    msg.send "Yehi kaam firse ni yrrrr"