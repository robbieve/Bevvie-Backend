const PushHandler = require('./handler')
const model = require('../../../mensamatic_push/app_api/models/models')
const executePushHandler = function (settings, pushMessage, token) {
    let PushSender = new PushHandler(settings)
    var a = this;
    PushSender.send(token, pushMessage)
        .then((result) => {
            if(!result || result._length == 0){
                console.log("Error sending push")
                return
            }
            var value = result[0]
            model.Push.findOne({push_id: value.push.push_id})
                .then(push => {
                    if(push) {
                        if(value.success > 0){
                            push.state = 'sent'
                            push.sent_at = Date.now()
                            push.modified_at = Date.now()
                        }else if(value.failure > 0){
                            push.state = 'error'
                            push.modified_at = Date.now()
                            push.error_message = value.message
                        }
                        push.save()
                            .then(push => {
                                console.log(`Notification saved: $push`)
                            })
                            .catch(error => {
                                console.log(`Can not save notification $error`)
                            })
                    }else {
                        console.log('Push not found')
                    }
                })
                .catch(error => {
                    console.log(error)
                })
        })
        .catch(error => {
          console.log(error)
        })
}


module.exports = {
    executePushHandler
}