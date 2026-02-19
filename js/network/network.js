/**
 * Network - Simulates network layer with delays and message drops
 * Routes messages between clients and servers
 */

const Network = {
    // Network configuration
    config: {
        minDelay: CONFIG.NETWORK.MIN_DELAY,
        maxDelay: CONFIG.NETWORK.MAX_DELAY,
        dropRate: CONFIG.NETWORK.DROP_RATE
    },
    
    // Registered servers
    servers: {},
    
    // Statistics
    stats: {
        requestsSent: 0,
        requestsDelivered: 0,
        requestsDropped: 0,
        responsesSent: 0,
        responsesDelivered: 0,
        responsesDropped: 0
    },
    
    /**
     * Initialize network
     */
    init: function() {
        Utils.log('Network', 'Network initialized', this.config);
    },
    
    /**
     * Register a server with the network
     */
    registerServer: function(baseUrl, serverHandler) {
        this.servers[baseUrl] = serverHandler;
        Utils.log('Network', `Server registered: ${baseUrl}`);
    },
    
    /**
     * Find appropriate server for a URL
     */
    findServer: function(url) {
        // Check each registered server base URL
        for (const baseUrl in this.servers) {
            if (url.startsWith(baseUrl)) {
                return this.servers[baseUrl];
            }
        }
        return null;
    },
    
    /**
     * Send request from client to server
     */
    sendRequest: function(request, onSuccess, onError) {
        this.stats.requestsSent++;
        
        Utils.log('Network', 'Request received from client', {
            method: request.method,
            url: request.url
        });
        
        // Check if message should be dropped
        if (Utils.shouldDropMessage(this.config.dropRate)) {
            this.stats.requestsDropped++;
            Utils.log('Network', '❌ Request DROPPED (simulated network failure)');
            
            setTimeout(() => {
                onError({
                    status: CONFIG.STATUS.NETWORK_ERROR,
                    message: CONFIG.MESSAGES.NETWORK_DROPPED
                });
            }, Utils.randomDelay(CONFIG.NETWORK.MIN_DELAY, CONFIG.NETWORK.MAX_DELAY));
            return;
        }
        
        // Find appropriate server
        const server = this.findServer(request.url);
        
        if (!server) {
            this.stats.requestsDropped++;
            Utils.log('Network', `❌ No server found for URL: ${request.url}`);
            
            setTimeout(() => {
                onError({
                    status: CONFIG.STATUS.NOT_FOUND,
                    message: CONFIG.MESSAGES.SERVER_NOT_FOUND
                });
            }, 100);
            return;
        }
        
        // Simulate network delay and deliver to server
        const delay = Utils.randomDelay(this.config.minDelay, this.config.maxDelay);
        Utils.log('Network', `⏳ Request delayed for ${delay}ms`);
        
        setTimeout(() => {
            this.stats.requestsDelivered++;
            Utils.log('Network', '✅ Request delivered to server');
            
            // Server handles the request
            server.handleRequest(request, (response) => {
                this.sendResponse(response, onSuccess, onError);
            });
        }, delay);
    },
    
    /**
     * Send response from server back to client
     */
    sendResponse: function(response, onSuccess, onError) {
        this.stats.responsesSent++;
        
        Utils.log('Network', 'Response received from server', {
            status: response.status
        });
        
        // Check if response should be dropped
        if (Utils.shouldDropMessage(this.config.dropRate)) {
            this.stats.responsesDropped++;
            Utils.log('Network', '❌ Response DROPPED (simulated network failure)');
            
            setTimeout(() => {
                onError({
                    status: CONFIG.STATUS.NETWORK_ERROR,
                    message: CONFIG.MESSAGES.NETWORK_DROPPED
                });
            }, Utils.randomDelay(CONFIG.NETWORK.MIN_DELAY, CONFIG.NETWORK.MAX_DELAY));
            return;
        }
        
        // Simulate network delay and deliver to client
        const delay = Utils.randomDelay(this.config.minDelay, this.config.maxDelay);
        Utils.log('Network', `⏳ Response delayed for ${delay}ms`);
        
        setTimeout(() => {
            this.stats.responsesDelivered++;
            Utils.log('Network', '✅ Response delivered to client');
            onSuccess(response);
        }, delay);
    },
    
    /**
     * Update network configuration
     */
    updateConfig: function(newConfig) {
        this.config = { ...this.config, ...newConfig };
        Utils.log('Network', 'Network configuration updated', this.config);
    },
    
    /**
     * Get network statistics
     */
    getStats: function() {
        return { ...this.stats };
    },
    
    /**
     * Reset statistics
     */
    resetStats: function() {
        this.stats = {
            requestsSent: 0,
            requestsDelivered: 0,
            requestsDropped: 0,
            responsesSent: 0,
            responsesDelivered: 0,
            responsesDropped: 0
        };
        Utils.log('Network', 'Statistics reset');
    },
    
    /**
     * Print network statistics
     */
    printStats: function() {
        console.log('=== Network Statistics ===');
        console.log(`Requests: ${this.stats.requestsSent} sent, ${this.stats.requestsDelivered} delivered, ${this.stats.requestsDropped} dropped`);
        console.log(`Responses: ${this.stats.responsesSent} sent, ${this.stats.responsesDelivered} delivered, ${this.stats.responsesDropped} dropped`);
        console.log(`Drop rate: ${(this.config.dropRate * 100).toFixed(1)}%`);
        console.log('========================');
    }
};

// Initialize and make Network globally available
if (typeof window !== 'undefined') {
    window.Network = Network;
    Network.init();
}