import { action, cube, state } from 'recube';
import { Box } from '@/components/box';

type PriceType = 'discount' | 'origin';
const changePrice = action<number>();
const changePriceType = action<PriceType>();
const changeDiscount = action<number>();
const priceType = state<PriceType>('discount').when(changePriceType);
const price = state(10).when(changePrice);
const discount = state(10).when(changeDiscount);

const FinalPriceSection = cube(() => {
  const finalPrice =
    priceType() === 'discount'
      ? price() - price() * discount() * 0.01
      : price();

  return (
    <Box flash>
      <h2>Final Price: {finalPrice}</h2>
    </Box>
  );
});

const DiscountSection = cube(() => {
  return (
    <div>
      Discount (%){' '}
      <input
        type="number"
        value={discount()}
        onChange={e => changeDiscount(parseInt(e.currentTarget.value, 10) || 0)}
      />
    </div>
  );
});

const PriceSection = cube(() => {
  return (
    <div>
      Price{' '}
      <input
        type="number"
        value={price()}
        onInput={e => changePrice(parseInt(e.currentTarget.value, 10) || 0)}
      />
    </div>
  );
});

const PriceTypeSection = cube(() => {
  return (
    <div>
      <label>
        Discount Price
        <input
          type="checkbox"
          checked={priceType() === 'discount'}
          onClick={() =>
            changePriceType(priceType() === 'discount' ? 'origin' : 'discount')
          }
        />
      </label>
    </div>
  );
});

const ConditionalDependency = () => (
  <div className="container-box">
    <main>
      <h1>Conditional Dependency</h1>
      <blockquote>
        When `Discount Price` option is off, changing Discount value will not be
        possible affect the `Final Price`
      </blockquote>
      <PriceSection />
      <DiscountSection />
      <PriceTypeSection />
      <FinalPriceSection />
    </main>
  </div>
);

export default ConditionalDependency;
