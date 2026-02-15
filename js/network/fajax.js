/**
 * FXMLHttpRequest - Fake AJAX implementation
 * Simulates XMLHttpRequest behavior for client-server communication
 */

class FXMLHttpRequest {
    constructor() {
        // Properties similar to XMLHttpRequest
        this.readyState = 0; // 0: UNSENT, 4: DONE
        this.status = 0;
        this.statusText = '';
        this.responseText = '';
        this.responseType = '';
        
        // Request properties
        this._method = '';
        this._url = '';
        this._headers = {};
        this._requestBody = null;
        
        // Callbacks
        this.onload = null;
        this.onerror = null;
        this.ontimeout = null;
        this.onreadystatechange = null;
        
        // Timeout
        this.timeout = 0;
        this._timeoutId = null;
        
        Utils.log('FAJAX', 'FXMLHttpRequest object created');
    }
    
    /**
     * Opens the request
     */
    open(method, url, async = true) {
        this._method = method.toUpperCase();
        this._url = url;
        this.readyState = 1; // OPENED
        
        Utils.log('FAJAX', `Request opened: ${this._method} ${this._url}`);
        
        if (this.onreadystatechange) {
            this.onreadystatechange();
        }
    }
    
    /**
     * Sets a request header
     */
    setRequestHeader(header, value) {
        this._headers[header] = value;
        Utils.log('FAJAX', `Header set: ${header} = ${value}`);
    }
    
    /**
     * Sends the request
     */
    send(body = null) {
        if (this.readyState !== 1) {
            console.error('FAJAX: Request not opened');
            return;
        }
        
        this._requestBody = body;
        this.readyState = 2; // HEADERS_RECEIVED
        
        // Automatically attach cookies to request (like browser does)
        this._attachCookies();
        
        // Create request object to send through network
        const request = {
            method: this._method,
            url: this._url,
            headers: this._headers,
            body: this._requestBody,
            timestamp: Date.now()
        };
        
        Utils.log('FAJAX', 'Sending request through network', request);
        
        // Set timeout if specified
        if (this.timeout > 0) {
            this._timeoutId = setTimeout(() => {
                this._handleTimeout();
            }, this.timeout);
        }
        
        // Send through network layer
        Network.sendRequest(request, (response) => {
            this._handleResponse(response);
        }, (error) => {
            this._handleError(error);
        });
    }
    
    /**
     * Aborts the request
     */
    abort() {
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
        }
        this.readyState = 0;
        Utils.log('FAJAX', 'Request aborted');
    }
    
    /**
     * Gets all response headers (not implemented in simulation)
     */
    getAllResponseHeaders() {
        return '';
    }
    
    /**
     * Gets a specific response header (not implemented in simulation)
     */
    getResponseHeader(header) {
        return null;
    }
    
    /**
     * Handle successful response
     */
    _handleResponse(response) {
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
        }
        
        // Process Set-Cookie headers from server
        this._processCookies(response);
        
        this.readyState = 4; // DONE
        this.status = response.status;
        this.statusText = response.statusText || '';
        this.responseText = response.body || '';
        
        Utils.log('FAJAX', 'Response received', {
            status: this.status,
            url: this._url
        });
        
        if (this.onreadystatechange) {
            this.onreadystatechange();
        }
        
        if (this.onload) {
            this.onload();
        }
    }
    
    /**
     * Handle error response
     */
    _handleError(error) {
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
        }
        
        this.readyState = 4; // DONE
        this.status = error.status || CONFIG.STATUS.NETWORK_ERROR;
        this.statusText = error.message || 'Network Error';
        this.responseText = JSON.stringify({
            success: false,
            message: error.message || 'Network request failed'
        });
        
        Utils.log('FAJAX', 'Request error', error);
        
        if (this.onreadystatechange) {
            this.onreadystatechange();
        }
        
        if (this.onerror) {
            this.onerror();
        }
    }
    
    /**
     * Handle timeout
     */
    _handleTimeout() {
        this.readyState = 4; // DONE
        this.status = CONFIG.STATUS.NETWORK_ERROR;
        this.statusText = 'Timeout';
        this.responseText = JSON.stringify({
            success: false,
            message: CONFIG.MESSAGES.NETWORK_TIMEOUT
        });
        
        Utils.log('FAJAX', 'Request timeout');
        
        if (this.ontimeout) {
            this.ontimeout();
        }
        
        if (this.onerror) {
            this.onerror();
        }
    }
    
    /**
     * Automatically attach cookies to request (simulates browser behavior)
     */
    _attachCookies() {
        if (typeof CookieManager !== 'undefined') {
            // Get all cookies
            const cookies = CookieManager.getAll();
            
            // Build cookie string (like browser does)
            const cookieString = Object.entries(cookies)
                .map(([name, value]) => `${name}=${value}`)
                .join('; ');
            
            if (cookieString) {
                this._headers['Cookie'] = cookieString;
                Utils.log('FAJAX', 'Cookies attached to request', { cookieCount: Object.keys(cookies).length });
            }
        }
    }
    
    /**
     * Process Set-Cookie headers from response (simulates browser behavior)
     */
    _processCookies(response) {
        if (typeof CookieManager !== 'undefined' && response.headers) {
            const setCookie = response.headers['Set-Cookie'];
            
            if (setCookie) {
                // Parse Set-Cookie header (simplified)
                // In real browser, this is more complex
                const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
                
                cookies.forEach(cookieString => {
                    const parts = cookieString.split(';');
                    const [nameValue] = parts;
                    const [name, value] = nameValue.split('=');
                    
                    if (name && value) {
                        CookieManager.set(name.trim(), value.trim(), 7);
                        Utils.log('FAJAX', 'Cookie set from server', { name: name.trim() });
                    }
                });
            }
        }
    }
}

// Make FXMLHttpRequest globally available
if (typeof window !== 'undefined') {
    window.FXMLHttpRequest = FXMLHttpRequest;
}