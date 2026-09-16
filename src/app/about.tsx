import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CBN_URL = 'https://www.cbn.gov.ng/rates/exchratebycurrency.html';

/**
 * About and legal.
 *
 * Two obligations meet here. The CBN's terms permit reuse of its published
 * material provided the bank is expressly credited and the content is not
 * amended or distorted — hence the attribution below and the note about
 * rounding. And Canji must read as an observer of the market rather than a
 * participant in it, which is a legal distinction in Nigeria, not a
 * stylistic one.
 */
export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <ScrollView contentContainerClassName="px-5 py-6 gap-6">
        <View className="gap-1">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            className="self-start pb-2 active:opacity-70"
          >
            <Text className="text-sm font-semibold text-accent">‹ Back</Text>
          </Pressable>
          <Text className="text-3xl font-bold tracking-tight text-ink">
            About Canji
          </Text>
        </View>

        <Section title="What Canji is">
          <Body>
            Canji reports exchange rates between the Naira and other
            currencies. It shows where each rate came from and when it was
            observed, so you can judge for yourself how much to rely on it.
          </Body>
        </Section>

        <Section title="What Canji is not">
          <Body>
            Canji is an information service. It does not set, offer, quote or
            guarantee any rate, does not buy or sell currency, does not match
            buyers with sellers, and never holds your money. Every rate shown
            is an observation of what somebody else published or of what the
            market was doing.
          </Body>
        </Section>

        <Section title="Where the rates come from">
          <Body>
            Official market rates are published by the{' '}
            <Text className="font-semibold text-ink">
              Central Bank of Nigeria
            </Text>
            . Canji reproduces them unaltered and credits the Bank as their
            source.
          </Body>
          <Pressable
            onPress={() => void Linking.openURL(CBN_URL)}
            className="self-start rounded-lg bg-raised px-4 py-2 active:opacity-70"
          >
            <Text className="text-sm font-semibold text-accent">
              View the CBN rates page
            </Text>
          </Pressable>
          <Body>
            Parallel market rates come from market observation, recorded by
            hand several times a day. They are indicative: they describe what
            was seen, not a price anyone is obliged to honour.
          </Body>
        </Section>

        <Section title="Rounding">
          <Body>
            Rates are stored exactly as published and rounded only for
            display — parallel rates to the nearest Naira, official rates to
            two decimal places. A figure here may therefore differ in the last
            decimal from the same figure elsewhere. Nothing is altered; only
            the presentation is shortened.
          </Body>
        </Section>

        <Section title="Freshness">
          <Body>
            Every rate carries the time it was observed and a one-word
            judgement of how current it is.
          </Body>
          <View className="gap-2 pt-1">
            <Meaning tone="text-fresh" label="Fresh">
              Recent enough to rely on.
            </Meaning>
            <Meaning tone="text-aging" label="Aging">
              Still useful, but a newer rate probably exists.
            </Meaning>
            <Meaning tone="text-stale" label="Stale">
              Old enough that you should check elsewhere before acting.
            </Meaning>
          </View>
          <Body>
            The two markets are judged differently. The parallel market trades
            continuously, so its rates are measured in elapsed hours. The
            official rate is published on weekdays only, so a Friday rate is
            still current all weekend rather than decaying while its source is
            simply closed.
          </Body>
        </Section>

        <Section title="Times">
          <Body>
            All times are West Africa Time, wherever your phone happens to be.
            A rate is a Nigerian fact, and showing it in another timezone
            would make it easy to misjudge its age.
          </Body>
        </Section>

        <View className="gap-2 rounded-2xl border border-line bg-surface p-5">
          <Text className="text-xs leading-5 text-muted">
            Rates are indicative, sourced from market observation, and for
            information only. They are not an offer, a quotation, or financial
            advice. Canji accepts no liability for decisions made on the basis
            of information shown here.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-3">
      <Text className="text-xs font-semibold uppercase tracking-widest text-faint">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return <Text className="text-sm leading-6 text-muted">{children}</Text>;
}

function Meaning({
  tone,
  label,
  children,
}: {
  tone: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row gap-3">
      <Text className={`w-14 text-sm font-semibold ${tone}`}>{label}</Text>
      <Text className="flex-1 text-sm leading-6 text-muted">{children}</Text>
    </View>
  );
}
