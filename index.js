'use strict';

/**
 * Dependencies
 */

const AWS = require('aws-sdk');

class SNS {
    /**
     * @param {Object} params
     * @param {Object} params.snsAppArnMap
     * @param {String} params.snsAppArnMap.ios
     * @param {String} params.snsAppArnMap.android
     * @param {String} params.snsRegion Check SNS region[http://docs.aws.amazon.com/general/latest/gr/rande.html#sns_region]
     */

    constructor(params){
        params = params || {};
        this.sns = new AWS.SNS({region: params.snsRegion || 'ap-northeast-1'});

        this.snsAppArnMap = params.snsAppArnMap;

        // instance methods
        this.sendJson = sendJson;
        this.sendPayload = sendPayload;
        this.createDeviceArn = createDeviceArn;
    }
}

/**
 * Expose
 */

module.exports = SNS;

/**
 * Instance methods implements
 */

/**
 * Send push notification to android and ios
 * @param {Object} params
 * @param {String} params.json.message App side action identifier
 * @param {String} params.json.alert Main text displayed
 * @param {String} params.json.data Extra data
 * @param {String} params.json.sound For ios. Default 'Ding'
 * @param {String} params.json.badge For ios. Default 0
 * @param {String} params.deviceArn
 * @param {String[]} params.deviceArns
 * @return {Object[]} Array of each push result
 */
// TODO: TopicArn

function *sendJson(params){
    // merge deviceArn and deviceArns
    if(params.deviceArns === undefined) params.deviceArns = [];
    if(typeof params.deviceArns === 'string') params.deviceArns = params.deviceArns.split(' ');

    let ret = {};
    const payload = _buildPayload(params.json);
    for(const deviceArn of params.deviceArns){
        ret[deviceArn] = yield this.sendPayload({payload, deviceArn});
    }

    console.log('(simple-aws-sns) sendJson result:', ret);
    return ret;
}

/**
 * Send one push notification to android and ios
 * @param {Object} params
 * @param {String} params.payload
 * @param {String} params.deviceArn
 * @return {Object} Result from AWS
 */

function *sendPayload(params){
    // do publish
    let self = this;
    return yield new Promise(function(resolve, reject){
        console.log('(simeple-aws-sns) sendPayload start:');
        const start = Date.now();
        self.sns.publish({
            Message: params.payload,
            MessageStructure: 'json',
            TargetArn: params.deviceArn
        }, function(err, data){
            console.log('(simeple-aws-sns) sendPayload end: time, err, data:', Date.now()-start, err, data);
            if(err) reject(err);
            resolve(data);
        });
    });
}

/**
 * Create deviceArn for ios or android
 * @param {Object} params
 * @param {String=ios,android} params.deviceType
 * @param {String} params.deviceToken
 * @return {String} Created deviceArn
 */

function *createDeviceArn(params){
    let self = this;
    return yield new Promise(function(resolve, reject){
        console.log('(simeple-aws-sns) createDeviceArn start:');
        const start = Date.now();
        self.sns.createPlatformEndpoint({
            PlatformApplicationArn: self.snsAppArnMap[params.deviceType],
            Token: params.deviceToken
        }, function(err, data){
            console.log('(simeple-aws-sns) createDeviceArn end: time, err, data:', Date.now()-start, err, data);
            if(err) reject(err);
            resolve(data.EndpointArn);
        });
    });
}

/**
 * Build payload string to send
 * @param {Object} params
 * @param {String} params.message App side action identifier
 * @param {String} params.alert Main text displayed
 * @param {String} params.data Optional. Extra data.
 * @param {String} params.sound Optional. For ios. Default 'Ding'
 * @param {String} params.badge Optional. For ios. Default 0
 */

function _buildPayload(params){
    // common payload
    const basic = {
        message: params.message,
        alert: params.alert
    };
    if(params.data !== undefined) basic.data = params.data;

    let payload = {
        default: 'default',
        GCM: { data: basic },
        APNS: { aps: basic }
    };

    // for ios
    Object.assign(payload.APNS.aps, {
        sound: params.sound || 'Ding',
        badge: params.badge || 0
    });

    // correctly escape
    payload.GCM = JSON.stringify(payload.GCM);
    payload.APNS = JSON.stringify(payload.APNS);
    payload = JSON.stringify(payload);

    console.log('(simple-aws-sns) payload built:', payload);
    return payload;
}
