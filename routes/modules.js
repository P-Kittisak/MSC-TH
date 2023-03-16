class CartData {
    constructor(req) {
        this.req = req;
    }

    async getData() {
        var summary = this.req.session.summary;
        var cartSummary;
        if (summary)
            cartSummary = {
                subTotal: summary.subTotal.toFixed(2),
                total: summary.total.toFixed(2),
                shipCost: summary.shipCost,
                totalQuantity:summary.totalQuantity
            };
        this.req.session.cartSummary = cartSummary;
        return {
            summary:cartSummary,
        };
    }
}
module.exports = CartData;