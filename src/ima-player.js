// ima-player.js

import {makeNum, makeDefault} from './utils'
import Observable from './observable'

/* global google */

export default class ImaPlayer {
  constructor(options) {
    this._configure(options)
    this._evt = new Observable()
    this._adRequesting = false
    this._adRequested = false

    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.ImaSdkSettings#setVpaidMode
    this._o.vpaidMode && google.ima.settings.setVpaidMode(this._resolvedVpaidMode)

    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.ImaSdkSettings#setLocale
    this._o.locale && google.ima.settings.setLocale(this._o.locale)

    // Assumes the display container and video element are correctly positioned and sized
    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side#html
    this._adDisplayContainer = new google.ima.AdDisplayContainer(this._o.displayContainer, this._o.video, this._o.clickTracking)
    this._adDisplayContainerInit = false
  }

  _configure(o) {
    this._o = {
      displayContainer: o.displayContainer,
      video: o.video,
      tag: o.tag,
    }

    // VPAID mode will be ima SDK default (if not set)
    if (o.vpaidMode) {
      this._o.vpaidMode = makeNum(o.vpaidMode, undefined)
    }

    if (o.maxDuration) {
      this._o.maxDuration = makeNum(o.maxDuration, undefined)
    }

    // Default is undefined
    this._o.locale = o.locale

    // Default is undefined or alternative video ad click element
    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdDisplayContainer
    this._o.clickTracking = o.clickTracking

    // Default is undefined or object
    this._o.adsRequestOptions = o.adsRequestOptions

    // Default is undefined or object
    this._o.adsRenderingOptions = o.adsRenderingOptions

    // Default is to let IMA SDK handle non-linear display duration
    this._o.nonLinearMaxDuration = makeNum(o.nonLinearMaxDuration, -1)

    // Assumes by default that the playback is consented by user
    this._o.adWillAutoPlay = !!makeDefault(o.adWillAutoPlay, true)
    this._o.adWillPlayMuted = !!makeDefault(o.adWillPlayMuted, false)

    // Default is undefined
    this._o.continuousPlayback = o.continuousPlayback

    // Default is to tell the SDK NOT to save and restore content video state
    this._o.restoreVideo =  !!makeDefault(o.restoreVideo, false)
  }

  _setProperties(target, properties) {
    for (let prop in properties) {
      if (typeof target[prop] !== 'undefined') {
        target[prop] = properties[prop]
      }
    }
  }

  static get vpaidMode() {
    return {
      DISABLED: 0,
      ENABLED: 1,
      INSECURE: 2
    }
  }

  get _resolvedVpaidMode() {
    if (this._o.vpaidMode === ImaPlayer.vpaidMode.DISABLED) {
      return google.ima.ImaSdkSettings.VpaidMode.DISABLED
    }

    if (this._o.vpaidMode === ImaPlayer.vpaidMode.INSECURE) {
      return google.ima.ImaSdkSettings.VpaidMode.INSECURE
    }

    // Default to SECURE mode
    return google.ima.ImaSdkSettings.VpaidMode.ENABLED
  }

  on(name, cb) {
    this._evt.subscribe(name, cb)
  }

  off(name, cb = null) {
    if (cb === null) {
      this._evt.unsubscribeAll(name)
    } else {
      this._evt.unsubscribe(name, cb)
    }
  }

  play() {
    this._dispatch('ad_play_intent')
    this._adPlayIntent = true
    this.initAdDisplayContainer()
    this._requestAd()
  }

  request(options) {
    this._dispatch('ad_request_intent', options)
    this._requestAd(options)
  }

  resize(width, height, viewMode = null) {
    if (this._adsManager) {
      // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdsManager#resize
      viewMode || (viewMode = google.ima.ViewMode.NORMAL)
      this._adsManager.resize(width, height, viewMode)
    }
  }

  setVolume(volume) {
    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdsManager#setVolume
    this._adsManager && this._adsManager.setVolume(volume)
  }

  getVolume() {
    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdsManager#getVolume
    return this._adsManager ? this._adsManager.getVolume() : null
  }

  discardAdBreak() {
    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdsManager#discardAdBreak
    this._adsManager && this._adsManager.discardAdBreak()
  }

  pause() {
    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdsManager#pause
    this._adsManager && this._adsManager.pause()
  }

  resume() {
    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdsManager#resume
    this._adsManager && this._adsManager.resume()
  }

  skip() {
    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdsManager#skip
    this._adsManager && this._adsManager.skip()
  }

  updateAdsRenderingSettings(adsRenderingSettings) {
    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdsManager#updateAdsRenderingSettings
    this._adsManager && this._adsManager.updateAdsRenderingSettings(adsRenderingSettings)
  }

  configureAdsManager(content, adsRenderingSettings) {
    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdsManager#configureAdsManager
    this._adsManager && this._adsManager.configureAdsManager(content, adsRenderingSettings)
  }

  focus() {
    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdsManager#focus
    this._adsManager && this._adsManager.focus()
  }

  getDisplayContainer() {
    return this._o.displayContainer
  }

  getCuePoints() {
    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdsManager#getCuePoints
    return this._adsManager ? this._adsManager.getCuePoints() : null
  }

  getAdSkippableState() {
    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdsManager#getAdSkippableState
    return this._adsManager ? this._adsManager.getAdSkippableState() : null
  }

  getRemainingTime() {
    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdsManager#getRemainingTime
    return this._adsManager ? this._adsManager.getRemainingTime() : null
  }

  isCustomClickTrackingUsed() {
    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdsManager#isCustomClickTrackingUsed
    return this._adsManager ? this._adsManager.isCustomClickTrackingUsed() : null
  }

  isCustomPlaybackUsed() {
    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdsManager#isCustomPlaybackUsed
    return this._adsManager ? this._adsManager.isCustomPlaybackUsed() : null
  }

  setAdWillAutoPlay(autoPlay) {
    this._o.adWillAutoPlay = autoPlay
  }

  setAdWillPlayMuted(muted) {
    this._o.adWillPlayMuted = muted
  }

  setContinuousPlayback(continuousPlayback) {
    this._o.continuousPlayback = continuousPlayback
  }

  stop() {
    this._dispatch('ad_stop_intent')
    this._stop()
  }

  ended() {
    // Signals the video content is finished.
    // This will allow to play post-roll ads (if any)
    this._adsLoader && this._adsLoader.contentComplete()
  }

  initAdDisplayContainer() {
    // Must be done via a user interaction
    if (! this._adDisplayContainerInit) {
      this._adDisplayContainer.initialize()
      this._adDisplayContainerInit = true
    }
  }

  destroy(unsubscribeEvents = true) {
    this._adsManager && this._adsManager.stop()
    this._endAd()
    unsubscribeEvents && this._evt.unsubscribeAll()
    this._destroyAdsManager()
    this._destroyAdsLoader()
    this._destroyAdDisplayContainer()
    this._destroyOptions()
  }

  _destroyAdsLoader() {
    if (this._adsLoader) {
      this._adsLoader.destroy()
      this._adsLoader = null
      delete this._adsLoader
    }
  }

  _destroyAdsManager() {
    if (this._adsManager) {
      this._adsManager.destroy()
      this._adsManager = null
      delete this._adsManager
    }
  }

  _destroyAdDisplayContainer() {
    if (this._adDisplayContainer) {
      this._adDisplayContainer.destroy()
      this._adDisplayContainer = null
      delete this._adDisplayContainer
    }
  }

  _destroyOptions() {
    this._o = null
    delete this._o
  }

  _stop() {
    this._dispatch('ad_stop')
    if (this._adsManager) {
      // Signal ads manager to stop and get back to content
      this._adsManager.stop()
    } else {
      this._endAd()
    }
  }

  _makeAdsLoader() {
    this._adsLoader = new google.ima.AdsLoader(this._adDisplayContainer)

    this._adsLoader.addEventListener(
      google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      (e) => {
        this._onAdsManagerLoaded(e)
      }
    )

    this._adsLoader.addEventListener(
      google.ima.AdErrorEvent.Type.AD_ERROR,
      (e) => {
        this._adRequested = false
        this._onAdError(e)
      }
    )
  }

  _requestAd(options) {
    // Check if ad request is pending
    if (this._adRequesting) {
      // Ad will autostart if play method called
      return
    }

    // Check if ad already requested (pre-request)
    if (this._adRequested) {
      // Start ad only if play method called
      if (this._adPlayIntent) {
        this._playAd()
      }

      return
    }

    this._adRequesting = true

    if (! this._adsLoader) {
      this._makeAdsLoader()
    }

    let adsRequest = new google.ima.AdsRequest()

    // Set ad request default settings
    adsRequest.adTagUrl = this._o.tag
    adsRequest.linearAdSlotWidth = this._o.video.offsetWidth
    adsRequest.linearAdSlotHeight = this._o.video.offsetHeight
    adsRequest.nonLinearAdSlotWidth = this._o.video.offsetWidth
    adsRequest.nonLinearAdSlotHeight = this._o.video.offsetHeight
    adsRequest.setAdWillAutoPlay(this._o.adWillAutoPlay)
    adsRequest.setAdWillPlayMuted(this._o.adWillPlayMuted)

    if (this._o.continuousPlayback !== undefined) {
      // Internally set AdsRequest.videoContinuousPlay to "0" if undefined, "1" if false, "2" if true
      adsRequest.setContinuousPlayback(this._o.continuousPlayback)
    }

    // Assumes that ad request options is an object with ads request properties
    // defined in the IMA SDK documentation (will override default settings)
    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdsRequest
    let adsRequestOptions = options ? options : this._o.adsRequestOptions
    if (adsRequestOptions) {
      this._setProperties(adsRequest, adsRequestOptions)
    }

    this._dispatch('ad_request', adsRequest)

    // The requestAds() method triggers _onAdsManagerLoaded() or _onAdError()
    this._adsLoader.requestAds(adsRequest)
  }

  _bindAdsManagerEvents() {
    this._adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, (e) => {
      this._onAdError(e)
    })

    this._adsManager.addEventListener(google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, (e) => {
      this._adEnded = false
      this._dispatch('content_pause_requested', e)
      this._dispatch('ad_begin') // "content_pause_requested" event alias
    })

    this._adsManager.addEventListener(google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, (e) => {
      this._dispatch('content_resume_requested', e)
      this._endAd()
    })

    this._adsManager.addEventListener(google.ima.AdEvent.Type.STARTED, (e) => {
      this._dispatch('started', e)

      let ad = e.getAd()

      if (ad.isLinear()) {
        this._o.maxDuration && this._startMaxDurationTimer()
      } else {
        // Signal non-linear ad scenario
        let duration = this._o.nonLinearMaxDuration
        this._dispatch('ad_non_linear', {ad, duration})

        // By default, IMA SDK will automatically close non-linear ad (after 45 seconds ?)
        if (this._o.nonLinearMaxDuration > 0) {
          setTimeout(() => {
            this._adsManager && this._adsManager.stop()
          }, this._o.nonLinearMaxDuration)
        }

        // Ends to play/resume content video
        this._endAd()
      }
    })

    this._adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, (e) => {
      this._adRequested = false
      this._dispatch('all_ads_completed', e)
    })

    let adEvents = {
      'ad_break_ready': google.ima.AdEvent.Type.AD_BREAK_READY,
      'ad_buffering': google.ima.AdEvent.Type.AD_BUFFERING,
      'ad_metadata': google.ima.AdEvent.Type.AD_METADATA,
      'ad_progress': google.ima.AdEvent.Type.AD_PROGRESS,
      'click': google.ima.AdEvent.Type.CLICK,
      'complete': google.ima.AdEvent.Type.COMPLETE,
      'duration_change': google.ima.AdEvent.Type.DURATION_CHANGE,
      'first_quartile': google.ima.AdEvent.Type.FIRST_QUARTILE,
      'impression': google.ima.AdEvent.Type.IMPRESSION,
      'interaction': google.ima.AdEvent.Type.INTERACTION,
      'linear_changed': google.ima.AdEvent.Type.LINEAR_CHANGED,
      'loaded': google.ima.AdEvent.Type.LOADED,
      'log': google.ima.AdEvent.Type.LOG,
      'midpoint': google.ima.AdEvent.Type.MIDPOINT,
      'paused': google.ima.AdEvent.Type.PAUSED,
      'resumed': google.ima.AdEvent.Type.RESUMED,
      'skippable_state_changed': google.ima.AdEvent.Type.SKIPPABLE_STATE_CHANGED,
      'skipped': google.ima.AdEvent.Type.SKIPPED,
      'third_quartile': google.ima.AdEvent.Type.THIRD_QUARTILE,
      'user_close': google.ima.AdEvent.Type.USER_CLOSE,
      'video_clicked': google.ima.AdEvent.Type.VIDEO_CLICKED,
      'video_icon_clicked': google.ima.AdEvent.Type.VIDEO_ICON_CLICKED,
      'volume_changed': google.ima.AdEvent.Type.VOLUME_CHANGED,
      'volume_muted': google.ima.AdEvent.Type.VOLUME_MUTED,
    }

    // Not documented, may be unavailable in the future
    google.ima.AdEvent.Type.AD_CAN_PLAY && (adEvents.ad_can_play = google.ima.AdEvent.Type.AD_CAN_PLAY)
    google.ima.AdEvent.Type.VIEWABLE_IMPRESSION && (adEvents.viewable_impression = google.ima.AdEvent.Type.VIEWABLE_IMPRESSION)

    for (let adEvent in adEvents) {
      this._adsManager.addEventListener(adEvents[adEvent], (e) => {
        this._dispatch(adEvent, e)
      })
    }
  }

  _onAdsManagerLoaded(adsManagerLoadedEvent) {
    this._dispatch('ads_manager_loaded', adsManagerLoadedEvent)

    // Create default ads rendering settings
    let adsRenderingSettings = new google.ima.AdsRenderingSettings()
    adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = this._o.restoreVideo

    // Assumes that ads rendering options is an object with ads rendering settings properties
    // defined in the IMA SDK documentation (will override default settings)
    // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdsRenderingSettings
    if (this._o.adsRenderingOptions) {
      this._setProperties(adsRenderingSettings, this._o.adsRenderingOptions)
    }

    this._dispatch('ads_rendering_settings', adsRenderingSettings)

    this._destroyAdsManager()
    this._adsManager = adsManagerLoadedEvent.getAdsManager(this._o.video, adsRenderingSettings)
    this._bindAdsManagerEvents()

    this._dispatch('ads_manager', this._adsManager)

    // Ad is ready to be played
    this._adRequesting = false
    this._adRequested = true

    if (this._adPlayIntent) {
      this._playAd()
    }
  }

  _onMaxDuration() {
    this._dispatch('error', new Error('Maximum duration of ' + this._o.maxDuration + ' ms reached'))
    this._stop()
  }

  _startMaxDurationTimer() {
    this._maxDurationTimer = setTimeout(() => { this._onMaxDuration() }, this._o.maxDuration)
  }

  _resetMaxDurationTimer() {
    if (typeof this._maxDurationTimer === 'number') {
      clearTimeout(this._maxDurationTimer)
      this._maxDurationTimer = undefined
    }
  }

  _onAdError(adErrorEvent) {
    // google.ima.AdErrorEvent : https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdErrorEvent
    // google.ima.AdError : https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima.AdError
    // console.log('onAdError: ' + adErrorEvent.getError())
    this._dispatch('ad_error', adErrorEvent)
    this._endAd()
  }

  _playAd() {
    try {
      this._dispatch('ad_play')
      this._adEnded = false

      this._adsManager.init(
        this._o.video.offsetWidth,
        this._o.video.offsetHeight,
        google.ima.ViewMode.NORMAL
      )
      this._adsManager.start()
    } catch (e) {
      // console.log('adsManager catched error', e)
      this._dispatch('error', e)
      this._endAd()
    }
  }

  _dispatch(name, e) {
    this._evt.notify(name, {
      name: name,
      data: e,
      target: this,
    })
  }

  _endAd() {
    if (this._adEnded) {
      return
    }

    this._adEnded = true
    this._adPlayIntent = false
    this._adRequesting = false
    this._resetMaxDurationTimer()
    this._dispatch('ad_end')
  }
}
