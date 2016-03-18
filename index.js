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
        this.updateDevice = updateDevice;
        this.getDevice = getDevice;
        this.removeDevice = removeDevice;
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
            console.log('(simeple-aws-sns) sendPayload end: time:', Date.now()-start);
            if(err){
                console.warn('(simeple-aws-sns) end: err:', err);
                resolve(err);
            }else{
                console.log('(simeple-aws-sns) sendPayload end: data:', data);
                resolve();
            }
        });
    });
}

/**
 * Create deviceArn for ios or android
 * @param {Object} params
 * @param {String=ios,android} params.deviceType
 * @param {String} params.deviceToken
 * @param {String} [params.userData] Custome user data to be stored
 * @return {String} Created deviceArn
 */

function *createDeviceArn(params){
    let self = this;
    return yield new Promise(function(resolve, reject){
        console.log('(simeple-aws-sns) createDeviceArn start:');
        const start = Date.now();

        let platformData = {
            PlatformApplicationArn: self.snsAppArnMap[params.deviceType],
            Token: params.deviceToken
        };
        if(params.userData) platformData.CustomUserData = params.userData;
        self.sns.createPlatformEndpoint( platformData, function(err, data){
            console.log('(simeple-aws-sns) createDeviceArn end: time, err, data:', Date.now()-start, err, data);
            if(err) reject(err);
            else resolve(data.EndpointArn);
        });
    });
}

/**
 * Update device attributes
 * @param {Object} params
 * @param {String} params.deviceArn
 * @param {String} [params.deviceToken]
 * @param {String} [params.userData] Custome user data to be stored
 */

function *updateDevice(params){
    let self = this;
    return yield new Promise(function(resolve, reject){
        console.log('(simeple-aws-sns) updateDevice start:');
        const start = Date.now();

        let attrData = {
            Attributes: {
                CustomUserData: params.userData,
                Token: params.deviceToken
            },
            EndpointArn: params.deviceArn
        };
        self.sns.setEndpointAttributes( attrData, function(err, data){
            console.log('(simeple-aws-sns) updateDevice end: time, err, data:', Date.now()-start, err, data);
            if(err) reject(err);
            else resolve(data);
        });
    });
}

/**
 * Get device enpoint data
 * @param {String} deviceArn
 * @return {Object} With attributes userData, deviceToken, enabled
 */

function *getDevice(deviceArn){
    let self = this;
    return yield new Promise(function(resolve, reject){
        console.log('(simeple-aws-sns) getDevice start:');
        const start = Date.now();

        self.sns.getEndpointAttributes( {EndpointArn: deviceArn}, function(err, data){
            console.log('(simeple-aws-sns) getDevice end: time, err, data:', Date.now()-start, err, data);
            if(err) return reject(err);

            let ret = {
                userData: data.Attributes.CustomUserData,
                deviceArn,
                deviceToken: data.Attributes.Token
            };
            resolve(ret);
        });
    });
}

/**
 * Remove device enpoint data
 * @param {String} deviceArn
 * @return {Object} 
 */

function *removeDevice(deviceArn){
    let self = this;
    return yield new Promise(function(resolve, reject){
        console.log('(simeple-aws-sns) removeDevice start:');
        const start = Date.now();

        self.sns.deleteEndpoint( {EndpointArn: deviceArn}, function(err, data){
            console.log('(simeple-aws-sns) removeDevice end: time, err, data:', Date.now()-start, err, data);
            if(err) return reject(err);
            resolve(data);
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
    payload.APNS_SANDBOX = payload.APNS;
    payload = JSON.stringify(payload);

    console.log('(simple-aws-sns) payload built:', payload);
    return payload;
}
