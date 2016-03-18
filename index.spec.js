"use strict";

const co = require('co');
const assert = require('chai').assert;

const SNS = require('./index');
const config = {
    snsRegion: 'ap-northeast-1',
    snsAppArnMap: {
        ios: 'arn:aws:sns:ap-northeast-1:408840679473:app/APNS_SANDBOX/yw-com-ios-test',
        android: 'arn:aws:sns:ap-northeast-1:408840679473:app/GCM/yw-com-android-test'
    }
};

const sns = new SNS(config);

const mock = {
    invalidDeviceArn: 'arn:aws:sns:ap-northeast-1:840362108436:endpoint/APNS_SANDBOX/com-test-ios/022f968d-8f9c-3e42-a29a-f965a19edd10',
    validDeviceArnIos: 'arn:aws:sns:ap-northeast-1:408840679473:endpoint/APNS_SANDBOX/yw-com-ios-test/7c1bac25-0285-3cbf-a6ff-cc4151a2ba71',
    validDeviceArnAndroid: 'arn:aws:sns:ap-northeast-1:408840679473:endpoint/GCM/yw-com-android-test/206caac6-baa3-3142-9665-a04c44e2d014'
};

describe('SNS', function(){
    it('should send push', co.wrap(function *(){
        const params = {
            json: { message: 'testing-message', alert: 'testing-alert', },
            deviceArns: [mock.validDeviceArnIos, mock.validDeviceArnAndroid]
        };

        let ret = yield sns.sendJson(params);
        params.deviceArns.forEach(function(arn){
            assert.isNotOk(ret[arn], 'has error');
        });
    }));

    it('should log push error', co.wrap(function *(){
        const params = {
            json: { message: 'testing-message', alert: 'testing-alert', },
            deviceArns: [mock.invalidDeviceArn]
        };

        let ret = yield sns.sendJson(params);
        params.deviceArns.forEach(function(arn){
            assert.isOk(ret[arn]);
        });
    }));

});
